import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"
import { extractBlockText } from "../properties.ts"

export const getCommand = defineCommand({
	meta: {
		name: "get",
		description: "Get a single block"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Block ID",
			required: true
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const block = await client.blocks.retrieve({ block_id: args.id })
			const b = block as {
				id: string
				type: string
				has_children: boolean
				created_time: string
				last_edited_time: string
				parent: { type: string; [key: string]: unknown }
				[key: string]: unknown
			}

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(block, format)
				return
			}

			printOutput(
				{
					id: b.id,
					type: b.type,
					content: extractBlockText(b),
					has_children: b.has_children,
					created: b.created_time,
					edited: b.last_edited_time,
					parent: `${b.parent.type}: ${b.parent[b.parent.type] ?? ""}`
				},
				format
			)
		} catch (error) {
			handleError(error)
		}
	}
})
