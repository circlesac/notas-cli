type Annotations = {
	bold: boolean
	italic: boolean
	strikethrough: boolean
	underline: boolean
	code: boolean
	color: string
}

type RichText = {
	type: string
	plain_text: string
	href?: string | null
	annotations: Annotations
	equation?: { expression: string }
}

export type NotionBlock = {
	id: string
	type: string
	has_children: boolean
	children?: NotionBlock[]
	[key: string]: unknown
}

export type MediaResolver = (blockId: string, url: string) => string

function renderRichText(rt: RichText): string {
	if (rt.type === "equation" && rt.equation) {
		return `$${rt.equation.expression}$`
	}

	let text = rt.plain_text
	if (!text) return ""

	const a = rt.annotations

	if (a.code) {
		text = `\`${text}\``
	} else {
		if (a.bold && a.italic) text = `***${text}***`
		else if (a.bold) text = `**${text}**`
		else if (a.italic) text = `*${text}*`
		if (a.strikethrough) text = `~~${text}~~`
	}

	if (rt.href) {
		text = `[${text}](${rt.href})`
	}

	return text
}

function renderRichTextArray(arr: RichText[] | undefined): string {
	if (!arr) return ""
	return arr.map(renderRichText).join("")
}

function indent(text: string, prefix: string): string {
	return text
		.split("\n")
		.map((line, i) => (i === 0 ? line : line.length > 0 ? prefix + line : line))
		.join("\n")
}

function getRichText(block: NotionBlock): RichText[] {
	const content = block[block.type] as { rich_text?: RichText[] } | undefined
	return content?.rich_text ?? []
}

type Context = {
	resolveMedia?: MediaResolver
	childPageLink?: (id: string, title: string) => string | null
	resolvePageLink?: (id: string) => string | null
}

function renderMedia(block: NotionBlock, ctx: Context): string {
	const type = block.type
	const data = block[type] as {
		type?: string
		file?: { url: string }
		external?: { url: string }
		caption?: RichText[]
	}
	if (!data) return ""

	let url = ""
	if (data.type === "file" && data.file) {
		url = data.file.url
		if (ctx.resolveMedia) {
			url = ctx.resolveMedia(block.id, url)
		}
	} else if (data.type === "external" && data.external) {
		url = data.external.url
	}

	const caption = renderRichTextArray(data.caption)

	if (type === "image") {
		return `![${caption}](${url})`
	}
	if (type === "video" || type === "audio" || type === "file" || type === "pdf") {
		const label = caption || type
		return `[${label}](${url})`
	}
	return url
}

function renderTable(block: NotionBlock): string {
	const children = block.children ?? []
	if (children.length === 0) return ""

	const tableInfo = block.table as { has_column_header?: boolean } | undefined
	const hasHeader = tableInfo?.has_column_header ?? false

	const rows: string[][] = []
	for (const row of children) {
		if (row.type !== "table_row") continue
		const rowData = row.table_row as { cells: RichText[][] } | undefined
		if (!rowData) continue
		rows.push(rowData.cells.map((cell) => renderRichTextArray(cell).replace(/\|/g, "\\|")))
	}

	if (rows.length === 0) return ""

	const colCount = rows[0]?.length ?? 0
	const lines: string[] = []

	if (hasHeader && rows.length > 0) {
		lines.push(`| ${rows[0]!.join(" | ")} |`)
		lines.push(`| ${Array(colCount).fill("---").join(" | ")} |`)
		for (const row of rows.slice(1)) {
			lines.push(`| ${row.join(" | ")} |`)
		}
	} else {
		lines.push(`| ${Array(colCount).fill("").join(" | ")} |`)
		lines.push(`| ${Array(colCount).fill("---").join(" | ")} |`)
		for (const row of rows) {
			lines.push(`| ${row.join(" | ")} |`)
		}
	}

	return lines.join("\n")
}

export function renderBlock(block: NotionBlock, ctx: Context, listIndex = 1): string {
	const t = block.type

	switch (t) {
		case "paragraph": {
			const text = renderRichTextArray(getRichText(block))
			const childMd = renderChildren(block, ctx)
			return childMd ? `${text}\n\n${childMd}` : text
		}
		case "heading_1":
		case "heading_2":
		case "heading_3":
		case "heading_4":
		case "heading_5":
		case "heading_6": {
			const level = parseInt(t.slice(-1), 10)
			const data = block[t] as { rich_text?: RichText[]; is_toggleable?: boolean }
			const text = renderRichTextArray(data?.rich_text)
			const heading = `${"#".repeat(level)} ${text}`
			if (data?.is_toggleable && block.has_children) {
				const childMd = renderChildren(block, ctx)
				return `<details>\n<summary>${"#".repeat(level)} ${text}</summary>\n\n${childMd}\n</details>`
			}
			return heading
		}
		case "bulleted_list_item": {
			const text = renderRichTextArray(getRichText(block))
			const childMd = renderChildren(block, ctx)
			const line = `- ${text}`
			return childMd ? `${line}\n${indent(childMd, "  ")}` : line
		}
		case "numbered_list_item": {
			const text = renderRichTextArray(getRichText(block))
			const childMd = renderChildren(block, ctx)
			const line = `${listIndex}. ${text}`
			return childMd ? `${line}\n${indent(childMd, "   ")}` : line
		}
		case "to_do": {
			const data = block.to_do as { rich_text?: RichText[]; checked?: boolean }
			const text = renderRichTextArray(data?.rich_text)
			const box = data?.checked ? "[x]" : "[ ]"
			const childMd = renderChildren(block, ctx)
			const line = `- ${box} ${text}`
			return childMd ? `${line}\n${indent(childMd, "  ")}` : line
		}
		case "quote": {
			const text = renderRichTextArray(getRichText(block))
			const childMd = renderChildren(block, ctx)
			const body = childMd ? `${text}\n\n${childMd}` : text
			return body
				.split("\n")
				.map((line) => (line.length > 0 ? `> ${line}` : ">"))
				.join("\n")
		}
		case "code": {
			const data = block.code as { rich_text?: RichText[]; language?: string }
			const lang = data?.language && data.language !== "plain text" ? data.language : ""
			const text = data?.rich_text?.map((r) => r.plain_text).join("") ?? ""
			return `\`\`\`${lang}\n${text}\n\`\`\``
		}
		case "divider":
			return "---"
		case "callout": {
			const data = block.callout as {
				rich_text?: RichText[]
				icon?: { type: string; emoji?: string }
			}
			const text = renderRichTextArray(data?.rich_text)
			const emoji = data?.icon?.type === "emoji" ? data.icon.emoji : ""
			const childMd = renderChildren(block, ctx)
			const head = emoji ? `${emoji} ${text}` : text
			const body = childMd ? `${head}\n\n${childMd}` : head
			return body
				.split("\n")
				.map((line) => (line.length > 0 ? `> ${line}` : ">"))
				.join("\n")
		}
		case "toggle": {
			const text = renderRichTextArray(getRichText(block))
			const childMd = renderChildren(block, ctx)
			return `<details>\n<summary>${text}</summary>\n\n${childMd}\n</details>`
		}
		case "table":
			return renderTable(block)
		case "image":
		case "file":
		case "video":
		case "audio":
		case "pdf":
			return renderMedia(block, ctx)
		case "bookmark":
		case "embed":
		case "link_preview": {
			const data = block[t] as { url?: string; caption?: RichText[] }
			const url = data?.url ?? ""
			const caption = renderRichTextArray(data?.caption) || url
			return `[${caption}](${url})`
		}
		case "equation": {
			const data = block.equation as { expression?: string }
			return `$$\n${data?.expression ?? ""}\n$$`
		}
		case "column_list":
		case "column":
		case "synced_block":
			return renderChildren(block, ctx)
		case "child_page": {
			const data = block.child_page as { title?: string }
			const title = data?.title ?? "Untitled"
			const link = ctx.childPageLink?.(block.id, title)
			return link ? `- [${title}](${link})` : `- ${title}`
		}
		case "child_database": {
			const data = block.child_database as { title?: string }
			return `<!-- child_database: ${data?.title ?? ""} -->`
		}
		case "link_to_page": {
			const data = block.link_to_page as {
				type?: string
				page_id?: string
				database_id?: string
			}
			const targetId = data?.page_id ?? data?.database_id ?? ""
			const local = targetId ? ctx.resolvePageLink?.(targetId) : null
			if (local) return `[→](${local})`
			if (targetId) {
				const url = `https://www.notion.so/${targetId.replace(/-/g, "")}`
				return `[→](${url})`
			}
			return ""
		}
		case "table_of_contents":
			return ""
		case "breadcrumb":
			return ""
		case "unsupported":
			return `<!-- unsupported block ${block.id} -->`
		default: {
			const text = renderRichTextArray(getRichText(block))
			return text || `<!-- unhandled block type: ${t} -->`
		}
	}
}

function renderChildren(block: NotionBlock, ctx: Context): string {
	if (!block.children || block.children.length === 0) return ""
	return renderBlocks(block.children, ctx)
}

export function renderBlocks(blocks: NotionBlock[], ctx: Context): string {
	const parts: string[] = []
	let numberedCounter = 0
	let prevType = ""

	for (const block of blocks) {
		if (block.type === "numbered_list_item") {
			if (prevType !== "numbered_list_item") numberedCounter = 0
			numberedCounter++
			parts.push(renderBlock(block, ctx, numberedCounter))
		} else {
			parts.push(renderBlock(block, ctx))
		}
		prevType = block.type
	}

	return parts.filter((p) => p.length > 0).join("\n\n")
}
