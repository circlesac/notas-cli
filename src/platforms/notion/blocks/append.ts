import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const appendCommand = defineCommand({
	meta: {
		name: "append",
		description: "Append child blocks to a page or block"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Parent block or page ID",
			required: true
		},
		type: {
			type: "string",
			description:
				"Block type: paragraph, heading_1, heading_2, heading_3, bulleted_list_item, numbered_list_item, to_do, toggle, code, quote, callout, divider, bookmark (default: paragraph)"
		},
		text: {
			type: "string",
			description: "Block text content"
		},
		language: {
			type: "string",
			description: "Code language (for code blocks)"
		},
		url: {
			type: "string",
			description: "URL (for bookmark blocks)"
		},
		checked: {
			type: "boolean",
			description: "Checked state (for to_do blocks)"
		},
		blocks: {
			type: "string",
			description: "Blocks as JSON array (for complex content)"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			let children: unknown[]

			if (args.blocks) {
				children = JSON.parse(args.blocks)
			} else {
				const blockType = args.type ?? "paragraph"

				if (blockType === "divider") {
					children = [{ object: "block", type: "divider", divider: {} }]
				} else if (blockType === "bookmark") {
					children = [
						{
							object: "block",
							type: "bookmark",
							bookmark: { url: args.url ?? "" }
						}
					]
				} else if (blockType === "code") {
					let text = args.text
					if (!text) {
						text = (await Bun.stdin.text()).trimEnd()
					}
					children = [
						{
							object: "block",
							type: "code",
							code: {
								rich_text: [{ type: "text", text: { content: text } }],
								language: args.language ?? "plain text"
							}
						}
					]
				} else if (blockType === "to_do") {
					let text = args.text
					if (!text) {
						text = (await Bun.stdin.text()).trimEnd()
					}
					children = [
						{
							object: "block",
							type: "to_do",
							to_do: {
								rich_text: [{ type: "text", text: { content: text ?? "" } }],
								checked: args.checked ?? false
							}
						}
					]
				} else {
					let text = args.text
					if (!text) {
						text = (await Bun.stdin.text()).trimEnd()
					}
					children = [
						{
							object: "block",
							type: blockType,
							[blockType]: {
								rich_text: [{ type: "text", text: { content: text ?? "" } }]
							}
						}
					]
				}
			}

			const response = await client.blocks.children.append({
				block_id: args.id,
				children: children as Parameters<typeof client.blocks.children.append>[0]["children"]
			})

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(response, format)
				return
			}

			const count = (response.results ?? []).length
			console.info(`\x1b[32m\u2713\x1b[0m Appended ${count} block${count === 1 ? "" : "s"}`)
		} catch (error) {
			handleError(error)
		}
	}
})
