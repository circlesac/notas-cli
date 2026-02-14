import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const getCommand = defineCommand({
	meta: {
		name: "get",
		description: "Get database details"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Database ID",
			required: true
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const db = await client.databases.retrieve({
				database_id: args.id
			})

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(db, format)
				return
			}

			const d = db as unknown as {
				id: string
				title?: Array<{ plain_text: string }>
				description?: Array<{ plain_text: string }>
				created_time: string
				last_edited_time: string
				is_inline?: boolean
				url?: string
			}

			printOutput(
				{
					id: d.id,
					title: d.title?.map((t) => t.plain_text).join("") ?? "",
					description: d.description?.map((t) => t.plain_text).join("") ?? "",
					created: d.created_time,
					edited: d.last_edited_time,
					inline: d.is_inline ?? false,
					url: d.url ?? ""
				},
				format
			)
		} catch (error) {
			handleError(error)
		}
	}
})
