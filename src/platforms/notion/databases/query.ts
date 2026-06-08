import { Client } from "@notionhq/client"
import { commonArgs, paginationArgs } from "../../../lib/args.ts"
import { defineLeafCommand } from "../../../lib/command.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"
import { flattenProperties } from "../properties.ts"

/**
 * Notion's 2025 API split databases into data sources. `db list` returns
 * data-source ids, which is what callers normally pass here. If a (classic)
 * database id is passed instead, resolve its first data source.
 */
async function resolveDataSourceId(client: Client, id: string): Promise<string> {
	try {
		await client.dataSources.retrieve({ data_source_id: id })
		return id
	} catch {
		const db = (await client.databases.retrieve({ database_id: id })) as {
			data_sources?: Array<{ id: string }>
		}
		const first = db.data_sources?.[0]?.id
		if (!first) throw new Error(`No data source found for database ${id}`)
		return first
	}
}

export const queryCommand = defineLeafCommand({
	meta: {
		name: "query",
		description: "Query a database with optional filters and sorts"
	},
	args: {
		...commonArgs,
		...paginationArgs,
		id: {
			type: "positional",
			description: "Database or data source ID",
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
			const client = createNotionClient(token)
			const dataSourceId = await resolveDataSourceId(client, args.id)

			const pages: Record<string, unknown>[] = []
			let cursor: string | undefined = args.cursor

			do {
				const response = await client.dataSources.query({
					data_source_id: dataSourceId,
					page_size: args.limit ? parseInt(args.limit, 10) : 100,
					...(cursor ? { start_cursor: cursor } : {}),
					...(args.filter ? { filter: JSON.parse(args.filter) } : {}),
					...(args.sort ? { sorts: JSON.parse(args.sort) } : {})
				})

				for (const result of response.results) {
					const page = result as unknown as {
						id: string
						url?: string
						properties?: Record<string, { id: string; type: string; [key: string]: unknown }>
					}
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
