import { defineCommand } from "citty"
import { commonArgs, paginationArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"
import { extractBlockText } from "../properties.ts"

export const listCommand = defineCommand({
	meta: {
		name: "list",
		description: "List child blocks of a page or block"
	},
	args: {
		...commonArgs,
		...paginationArgs,
		id: {
			type: "positional",
			description: "Parent block or page ID",
			required: true
		},
		recursive: {
			type: "boolean",
			description: "Recursively list all nested blocks"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const blocks: Record<string, unknown>[] = []

			async function fetchBlocks(parentId: string, depth: number): Promise<void> {
				let cursor: string | undefined = args.cursor
				do {
					const response = await client.blocks.children.list({
						block_id: parentId,
						page_size: args.limit ? parseInt(args.limit, 10) : 100,
						start_cursor: cursor
					})

					for (const block of response.results) {
						const b = block as {
							id: string
							type: string
							has_children: boolean
							created_time: string
							[key: string]: unknown
						}

						blocks.push({
							id: b.id,
							type: b.type,
							text: extractBlockText(b),
							children: b.has_children ? "yes" : "",
							depth
						})

						if (args.recursive && b.has_children) {
							await fetchBlocks(b.id, depth + 1)
						}
					}

					cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
				} while (args.all && cursor)
			}

			await fetchBlocks(args.id, 0)

			printOutput(blocks, getOutputFormat(args), [
				{ key: "id", label: "ID" },
				{ key: "type", label: "Type" },
				{ key: "text", label: "Content", width: 50 },
				{ key: "children", label: "Children" },
				{ key: "depth", label: "Depth" }
			])
		} catch (error) {
			handleError(error)
		}
	}
})
