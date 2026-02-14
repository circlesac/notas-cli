import { defineCommand } from "citty"
import { commonArgs, paginationArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"
import { extractTitle } from "../properties.ts"

export const searchCommand = defineCommand({
	meta: {
		name: "search",
		description: "Search across all pages and databases"
	},
	args: {
		...commonArgs,
		...paginationArgs,
		query: {
			type: "positional",
			description: "Search query text",
			required: false
		},
		type: {
			type: "string",
			description: "Filter by type: page or database",
			alias: "t"
		},
		sort: {
			type: "string",
			description: "Sort direction: ascending or descending (default: descending)"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const results: Record<string, unknown>[] = []
			let cursor: string | undefined = args.cursor

			do {
				const searchParams: Record<string, unknown> = {
					page_size: args.limit ? parseInt(args.limit, 10) : 100
				}

				if (args.query) searchParams.query = args.query
				if (cursor) searchParams.start_cursor = cursor

				if (args.type) {
					const typeValue = args.type === "database" ? "data_source" : args.type
					searchParams.filter = {
						property: "object",
						value: typeValue
					}
				}

				if (args.sort) {
					searchParams.sort = {
						direction: args.sort,
						timestamp: "last_edited_time"
					}
				}

				const response = await client.search(searchParams as Parameters<typeof client.search>[0])

				for (const item of response.results) {
					const obj = item as {
						id: string
						object: string
						url: string
						created_time: string
						last_edited_time: string
						properties?: Record<string, { id: string; type: string; [key: string]: unknown }>
						title?: Array<{ plain_text: string }>
					}

					let title = ""
					if (obj.object === "database" && obj.title) {
						title = obj.title.map((t) => t.plain_text).join("")
					} else if (obj.properties) {
						title = extractTitle(obj.properties)
					}

					results.push({
						id: obj.id,
						type: obj.object,
						title,
						edited: obj.last_edited_time,
						url: obj.url
					})
				}

				cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
			} while (args.all && cursor)

			printOutput(results, getOutputFormat(args), [
				{ key: "id", label: "ID" },
				{ key: "type", label: "Type" },
				{ key: "title", label: "Title", width: 40 },
				{ key: "edited", label: "Last Edited" }
			])
		} catch (error) {
			handleError(error)
		}
	}
})
