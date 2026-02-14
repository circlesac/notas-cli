import { defineCommand } from "citty"
import { commonArgs, stdinArgs } from "../../../lib/args.ts"
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
		...stdinArgs,
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
			if (args.stdio && args.text) {
				console.error("\x1b[31m\u2717\x1b[0m Cannot use both --stdio and --text")
				process.exit(1)
			}

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
				} else {
					let text = args.text
					if (!text && args.stdio) {
						text = (await Bun.stdin.text()).trimEnd()
					}
					if (!text) {
						console.error("\x1b[31m\u2717\x1b[0m No text provided. Use --text or --stdio")
						process.exit(1)
					}

					if (blockType === "code") {
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
						children = [
							{
								object: "block",
								type: "to_do",
								to_do: {
									rich_text: [{ type: "text", text: { content: text } }],
									checked: args.checked ?? false
								}
							}
						]
					} else {
						children = [
							{
								object: "block",
								type: blockType,
								[blockType]: {
									rich_text: [{ type: "text", text: { content: text } }]
								}
							}
						]
					}
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
