import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { createNotionClient } from "../client.ts"

export const deleteCommand = defineCommand({
	meta: {
		name: "delete",
		description: "Delete a block"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Block ID",
			required: true
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			await client.blocks.delete({ block_id: args.id })

			console.info(`\x1b[32m\u2713\x1b[0m Block deleted: ${args.id}`)
		} catch (error) {
			handleError(error)
		}
	}
})
