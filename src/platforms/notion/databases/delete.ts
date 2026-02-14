import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { createNotionClient } from "../client.ts"

export const deleteCommand = defineCommand({
	meta: {
		name: "delete",
		description: "Move a database to trash"
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

			await client.databases.update({
				database_id: args.id,
				in_trash: true
			})

			console.info(`\x1b[32m\u2713\x1b[0m Database trashed: ${args.id}`)
		} catch (error) {
			handleError(error)
		}
	}
})
