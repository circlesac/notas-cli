import { defineCommand } from "citty"
import { commonArgs, paginationArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const listCommand = defineCommand({
	meta: {
		name: "list",
		description: "List comments on a block or page"
	},
	args: {
		...commonArgs,
		...paginationArgs,
		id: {
			type: "positional",
			description: "Block or page ID",
			required: true
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const comments: Record<string, unknown>[] = []
			let cursor: string | undefined = args.cursor

			do {
				const response = await client.comments.list({
					block_id: args.id,
					page_size: args.limit ? parseInt(args.limit, 10) : 100,
					start_cursor: cursor
				})

				for (const comment of response.results) {
					const c = comment as {
						id: string
						created_time: string
						created_by: { id: string }
						rich_text: Array<{ plain_text: string }>
						parent: { type: string; [key: string]: unknown }
					}

					comments.push({
						id: c.id,
						created: c.created_time,
						author: c.created_by.id,
						text: c.rich_text.map((t) => t.plain_text).join("")
					})
				}

				cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
			} while (args.all && cursor)

			printOutput(comments, getOutputFormat(args), [
				{ key: "id", label: "ID" },
				{ key: "author", label: "Author" },
				{ key: "text", label: "Comment", width: 50 },
				{ key: "created", label: "Created" }
			])
		} catch (error) {
			handleError(error)
		}
	}
})
