import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const createCommand = defineCommand({
	meta: {
		name: "create",
		description: "Create a new database"
	},
	args: {
		...commonArgs,
		parent: {
			type: "positional",
			description: "Parent page ID",
			required: true
		},
		title: {
			type: "string",
			description: "Database title",
			required: true
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const db = await client.databases.create({
				parent: { type: "page_id", page_id: args.parent },
				title: [{ type: "text", text: { content: args.title } }]
			})

			const d = db as unknown as { id: string; url?: string }
			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(db, format)
				return
			}

			console.info(`\x1b[32m\u2713\x1b[0m Database created: ${d.id}`)
			if (d.url) console.info(`  URL: ${d.url}`)
		} catch (error) {
			handleError(error)
		}
	}
})
