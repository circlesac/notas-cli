import { defineCommand } from "citty"
import { commonArgs, paginationArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const listCommand = defineCommand({
	meta: {
		name: "list",
		description: "List all databases shared with the integration"
	},
	args: {
		...commonArgs,
		...paginationArgs
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const databases: Record<string, unknown>[] = []
			let cursor: string | undefined = args.cursor

			do {
				const response = await client.search({
					filter: { property: "object", value: "data_source" },
					page_size: args.limit ? parseInt(args.limit, 10) : 100,
					start_cursor: cursor
				})

				for (const result of response.results) {
					const d = result as unknown as {
						id: string
						object: string
						title?: Array<{ plain_text: string }>
						created_time: string
						last_edited_time: string
					}
					databases.push({
						id: d.id,
						type: d.object,
						title: d.title?.map((t) => t.plain_text).join("") ?? "",
						created: d.created_time,
						edited: d.last_edited_time
					})
				}

				cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
			} while (args.all && cursor)

			printOutput(databases, getOutputFormat(args), [
				{ key: "id", label: "ID" },
				{ key: "title", label: "Title" },
				{ key: "type", label: "Type" },
				{ key: "edited", label: "Last Edited" }
			])
		} catch (error) {
			handleError(error)
		}
	}
})
