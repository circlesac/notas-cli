import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"
import { extractTitle, flattenProperties } from "../properties.ts"

export const getCommand = defineCommand({
	meta: {
		name: "get",
		description: "Get a page and its properties"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Page ID",
			required: true
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const page = await client.pages.retrieve({ page_id: args.id })
			const p = page as {
				id: string
				url: string
				created_time: string
				last_edited_time: string
				archived: boolean
				properties: Record<string, { id: string; type: string; [key: string]: unknown }>
				parent: { type: string; [key: string]: unknown }
			}

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(page, format)
				return
			}

			const props = flattenProperties(p.properties)
			const title = extractTitle(p.properties)

			printOutput(
				{
					id: p.id,
					title,
					archived: p.archived,
					created: p.created_time,
					edited: p.last_edited_time,
					parent: `${p.parent.type}: ${p.parent[p.parent.type] ?? ""}`,
					url: p.url,
					...props
				},
				format
			)
		} catch (error) {
			handleError(error)
		}
	}
})
