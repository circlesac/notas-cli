import { access, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { commonArgs } from "../../../lib/args.ts"
import { defineLeafCommand } from "../../../lib/command.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { createNotionClient } from "../client.ts"
import { type NotionBlock, renderBlocks } from "../markdown.ts"
import { extractTitle } from "../properties.ts"

type NotionClient = ReturnType<typeof createNotionClient>

type PageInfo = {
	id: string
	title: string
	url: string
	lastEdited: string
	filename: string
}

function slugify(input: string): string {
	const base = input
		.normalize("NFC")
		.toLowerCase()
		.replace(/[^a-z0-9가-힣]+/g, "-")
		.replace(/^-+|-+$/g, "")
	return base || "untitled"
}

function shortId(id: string): string {
	return id.replace(/-/g, "").slice(-12)
}

function pageFilename(id: string, title: string): string {
	return `${slugify(title)}-${shortId(id)}.md`
}

async function fileExists(p: string): Promise<boolean> {
	try {
		await access(p)
		return true
	} catch {
		return false
	}
}

async function fetchAllChildren(client: NotionClient, blockId: string): Promise<NotionBlock[]> {
	const out: NotionBlock[] = []
	let cursor: string | undefined
	do {
		const response = await client.blocks.children.list({
			block_id: blockId,
			page_size: 100,
			start_cursor: cursor
		})
		for (const block of response.results) {
			out.push(block as unknown as NotionBlock)
		}
		cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
	} while (cursor)
	return out
}

async function fetchBlockTree(client: NotionClient, blockId: string, skipChildPages: boolean): Promise<NotionBlock[]> {
	const blocks = await fetchAllChildren(client, blockId)
	for (const block of blocks) {
		if (block.has_children) {
			if (block.type === "child_page" && skipChildPages) continue
			block.children = await fetchBlockTree(client, block.id, skipChildPages)
		}
	}
	return blocks
}

function collectChildPages(blocks: NotionBlock[], out: string[]): void {
	for (const block of blocks) {
		if (block.type === "child_page") {
			out.push(block.id)
		}
		if (block.children) collectChildPages(block.children, out)
	}
}

function extOf(url: string): string {
	try {
		const u = new URL(url)
		const ext = path.extname(u.pathname)
		return ext.length > 0 && ext.length <= 6 ? ext : ""
	} catch {
		return ""
	}
}

async function downloadMedia(url: string, dest: string): Promise<{ ok: boolean; error?: string }> {
	if (await fileExists(dest)) return { ok: true }
	try {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 30000)
		const response = await fetch(url, { signal: controller.signal })
		clearTimeout(timeout)
		if (!response.ok) return { ok: false, error: `HTTP ${response.status}` }
		const buf = new Uint8Array(await response.arrayBuffer())
		await mkdir(path.dirname(dest), { recursive: true })
		await writeFile(dest, buf)
		return { ok: true }
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) }
	}
}

function buildFrontmatter(info: PageInfo): string {
	const quote = (s: string) => s.replace(/"/g, '\\"')
	return ["---", `title: "${quote(info.title)}"`, `source: "${info.url}"`, `notion_id: "${info.id}"`, `last_edited: "${info.lastEdited}"`, "---", ""].join("\n")
}

async function exportPage(
	client: NotionClient,
	pageId: string,
	outDir: string,
	options: {
		recursive: boolean
		downloadMedia: boolean
		skip: Set<string>
		visited: Set<string>
		filenames: Map<string, string>
	}
): Promise<PageInfo | null> {
	const normalizedId = pageId.replace(/-/g, "")
	if (options.skip.has(normalizedId)) return null
	if (options.visited.has(normalizedId)) {
		const existing = options.filenames.get(normalizedId)
		if (existing) {
			return {
				id: pageId,
				title: "",
				url: "",
				lastEdited: "",
				filename: existing
			}
		}
		return null
	}
	options.visited.add(normalizedId)

	const page = (await client.pages.retrieve({ page_id: pageId })) as {
		id: string
		url: string
		last_edited_time: string
		properties: Record<string, { id: string; type: string; [key: string]: unknown }>
	}

	const title = extractTitle(page.properties) || "Untitled"
	const filename = pageFilename(page.id, title)
	options.filenames.set(normalizedId, filename)

	const blocks = await fetchBlockTree(client, page.id, false)

	if (options.recursive) {
		const childIds: string[] = []
		collectChildPages(blocks, childIds)
		for (const childId of childIds) {
			await exportPage(client, childId, outDir, options)
		}
	}

	const childPageLink = (id: string, childTitle: string): string | null => {
		const norm = id.replace(/-/g, "")
		if (options.skip.has(norm)) return null
		const existing = options.filenames.get(norm)
		if (existing) return existing
		return options.recursive ? pageFilename(id, childTitle) : null
	}

	const resolvePageLink = (id: string): string | null => {
		const norm = id.replace(/-/g, "")
		return options.filenames.get(norm) ?? null
	}

	const mediaDir = path.join(outDir, "_images")
	const pendingDownloads: Promise<unknown>[] = []
	const resolveMedia = options.downloadMedia
		? (blockId: string, url: string): string => {
				const ext = extOf(url) || ".bin"
				const idNorm = blockId.replace(/-/g, "")
				const dest = path.join(mediaDir, `${idNorm}${ext}`)
				pendingDownloads.push(
					downloadMedia(url, dest).then((result) => {
						if (!result.ok) {
							console.error(`\x1b[33m!\x1b[0m media download failed for ${blockId}: ${result.error}`)
						}
					})
				)
				return path.posix.join("_images", `${idNorm}${ext}`)
			}
		: undefined

	const body = renderBlocks(blocks, {
		resolveMedia,
		childPageLink,
		resolvePageLink
	})

	const info: PageInfo = {
		id: page.id,
		title,
		url: page.url,
		lastEdited: page.last_edited_time,
		filename
	}

	const md = `${buildFrontmatter(info)}\n# ${title}\n\n${body}\n`
	await mkdir(outDir, { recursive: true })
	await writeFile(path.join(outDir, filename), md, "utf8")

	if (pendingDownloads.length > 0) {
		await Promise.all(pendingDownloads)
	}

	console.info(`\x1b[32m\u2713\x1b[0m ${filename}`)
	return info
}

export const exportCommand = defineLeafCommand({
	meta: {
		name: "export",
		description: "Export a page to markdown files on disk"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Page ID",
			required: true
		},
		out: {
			type: "positional",
			description: "Output directory",
			required: true
		},
		recursive: {
			type: "boolean",
			description: "Recursively export child pages",
			alias: "r"
		},
		"download-media": {
			type: "boolean",
			description: "Download Notion-hosted media to <out>/_images/"
		},
		skip: {
			type: "string",
			description: "Comma-separated page IDs to skip"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const skip = new Set<string>()
			if (args.skip) {
				for (const id of args.skip.split(",")) {
					const trimmed = id.trim().replace(/-/g, "")
					if (trimmed) skip.add(trimmed)
				}
			}

			await exportPage(client, args.id, args.out, {
				recursive: Boolean(args.recursive),
				downloadMedia: Boolean(args["download-media"]),
				skip,
				visited: new Set(),
				filenames: new Map()
			})
		} catch (error) {
			handleError(error)
		}
	}
})
