import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const updateCommand = defineCommand({
	meta: {
		name: "update",
		description: "Update a block's content"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Block ID",
			required: true
		},
		text: {
			type: "string",
			description: "New text content"
		},
		checked: {
			type: "boolean",
			description: "Checked state (for to_do blocks)"
		},
		body: {
			type: "string",
			description: "Full block update body as JSON"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			if (args.body) {
				const body = JSON.parse(args.body)
				body.block_id = args.id
				const block = await client.blocks.update(body)

				const format = getOutputFormat(args)
				if (format === "json") {
					printOutput(block, format)
					return
				}
				console.info(`\x1b[32m\u2713\x1b[0m Block updated: ${args.id}`)
				return
			}

			const existing = await client.blocks.retrieve({ block_id: args.id })
			const e = existing as { type: string; [key: string]: unknown }
			const blockType = e.type

			const updateParams: Record<string, unknown> = {
				block_id: args.id
			}

			if (args.text !== undefined) {
				if (blockType === "code") {
					updateParams[blockType] = {
						rich_text: [{ type: "text", text: { content: args.text } }]
					}
				} else if (blockType === "to_do") {
					updateParams[blockType] = {
						rich_text: [{ type: "text", text: { content: args.text } }],
						...(args.checked !== undefined ? { checked: args.checked } : {})
					}
				} else {
					updateParams[blockType] = {
						rich_text: [{ type: "text", text: { content: args.text } }]
					}
				}
			} else if (args.checked !== undefined && blockType === "to_do") {
				updateParams[blockType] = { checked: args.checked }
			}

			const block = await client.blocks.update(updateParams as Parameters<typeof client.blocks.update>[0])

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(block, format)
				return
			}

			console.info(`\x1b[32m\u2713\x1b[0m Block updated: ${args.id}`)
		} catch (error) {
			handleError(error)
		}
	}
})
