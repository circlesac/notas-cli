import { defineCommand } from "citty"
import { commonArgs, paginationArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { notionFetch } from "../client.ts"
import { flattenProperties } from "../properties.ts"

export const queryCommand = defineCommand({
	meta: {
		name: "query",
		description: "Query a database with optional filters and sorts"
	},
	args: {
		...commonArgs,
		...paginationArgs,
		id: {
			type: "positional",
			description: "Database ID",
			required: true
		},
		filter: {
			type: "string",
			description: "Filter as JSON (Notion filter object)"
		},
		sort: {
			type: "string",
			description: 'Sort as JSON array (e.g. \'[{"property":"Name","direction":"ascending"}]\')'
		},
		columns: {
			type: "string",
			description: "Comma-separated property names to display"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)

			const pages: Record<string, unknown>[] = []
			let cursor: string | undefined = args.cursor

			do {
				const body: Record<string, unknown> = {
					page_size: args.limit ? parseInt(args.limit, 10) : 100
				}

				if (cursor) body.start_cursor = cursor
				if (args.filter) body.filter = JSON.parse(args.filter)
				if (args.sort) body.sorts = JSON.parse(args.sort)

				const response = (await notionFetch(token, `/v1/databases/${args.id}/query`, body)) as {
					results: Array<{
						id: string
						url?: string
						created_time: string
						last_edited_time: string
						properties?: Record<string, { id: string; type: string; [key: string]: unknown }>
					}>
					has_more: boolean
					next_cursor: string | null
					error?: string
					message?: string
				}

				if (response.error) {
					throw new Error(response.message ?? response.error)
				}

				for (const page of response.results) {
					const props = page.properties ? flattenProperties(page.properties) : {}
					pages.push({
						id: page.id,
						...props,
						url: page.url ?? ""
					})
				}

				cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
			} while (args.all && cursor)

			const format = getOutputFormat(args)

			if (format === "json") {
				printOutput(pages, format)
				return
			}

			if (pages.length === 0) {
				console.info("No results found.")
				return
			}

			const allKeys = Object.keys(pages[0]!)
			const displayKeys = args.columns ? ["id", ...args.columns.split(",").map((c) => c.trim())] : allKeys.filter((k) => k !== "url")

			const columns = displayKeys.map((key) => ({
				key,
				label: key
			}))

			printOutput(pages, format, columns)
		} catch (error) {
			handleError(error)
		}
	}
})
