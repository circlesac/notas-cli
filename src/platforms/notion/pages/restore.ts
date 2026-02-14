import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { createNotionClient } from "../client.ts"

export const restoreCommand = defineCommand({
	meta: {
		name: "restore",
		description: "Restore an archived page"
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

			await client.pages.update({
				page_id: args.id,
				archived: false
			})

			console.info(`\x1b[32m\u2713\x1b[0m Page restored: ${args.id}`)
		} catch (error) {
			handleError(error)
		}
	}
})
