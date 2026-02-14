import { defineCommand } from "citty"
import { commonArgs, stdinArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const createCommand = defineCommand({
	meta: {
		name: "create",
		description: "Create a new page"
	},
	args: {
		...commonArgs,
		...stdinArgs,
		parent: {
			type: "positional",
			description: "Parent page ID or database ID",
			required: true
		},
		"parent-type": {
			type: "string",
			description: "Parent type: page or database (default: page)"
		},
		title: {
			type: "string",
			description: "Page title",
			required: true
		},
		icon: {
			type: "string",
			description: "Page icon emoji"
		},
		cover: {
			type: "string",
			description: "Cover image URL"
		},
		properties: {
			type: "string",
			description: "Additional properties as JSON (for database pages)"
		},
		content: {
			type: "string",
			description: "Page body content as plain text (creates a paragraph block)"
		}
	},
	async run({ args }) {
		try {
			if (args.stdio && args.content) {
				console.error("\x1b[31m\u2717\x1b[0m Cannot use both --stdio and --content")
				process.exit(1)
			}

			let content = args.content
			if (!content && args.stdio) {
				content = (await Bun.stdin.text()).trimEnd()
			}

			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const parentType = args["parent-type"] ?? "page"
			const parent = parentType === "database" ? { type: "database_id" as const, database_id: args.parent } : { type: "page_id" as const, page_id: args.parent }

			const createParams: Record<string, unknown> = { parent }

			if (parentType === "database") {
				const properties: Record<string, unknown> = args.properties ? JSON.parse(args.properties) : {}
				properties["Name"] = {
					title: [{ type: "text", text: { content: args.title } }]
				}
				createParams.properties = properties
			} else {
				createParams.properties = {
					title: {
						title: [{ type: "text", text: { content: args.title } }]
					}
				}
			}

			if (args.icon) {
				createParams.icon = { type: "emoji", emoji: args.icon }
			}

			if (args.cover) {
				createParams.cover = {
					type: "external",
					external: { url: args.cover }
				}
			}

			if (content) {
				createParams.children = [
					{
						object: "block",
						type: "paragraph",
						paragraph: {
							rich_text: [{ type: "text", text: { content } }]
						}
					}
				]
			}

			const page = await client.pages.create(createParams as Parameters<typeof client.pages.create>[0])

			const p = page as { id: string; url: string }
			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(page, format)
				return
			}

			console.info(`\x1b[32m\u2713\x1b[0m Page created: ${p.id}`)
			console.info(`  URL: ${p.url}`)
		} catch (error) {
			handleError(error)
		}
	}
})
