import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const updateCommand = defineCommand({
	meta: {
		name: "update",
		description: "Update a database title or description"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Database ID",
			required: true
		},
		title: {
			type: "string",
			description: "New database title"
		},
		description: {
			type: "string",
			description: "New database description"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const updateParams: Record<string, unknown> = {
				database_id: args.id
			}

			if (args.title) {
				updateParams.title = [{ type: "text", text: { content: args.title } }]
			}

			if (args.description) {
				updateParams.description = [{ type: "text", text: { content: args.description } }]
			}

			const db = await client.databases.update(updateParams as Parameters<typeof client.databases.update>[0])

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(db, format)
				return
			}

			console.info(`\x1b[32m\u2713\x1b[0m Database updated: ${args.id}`)
		} catch (error) {
			handleError(error)
		}
	}
})
