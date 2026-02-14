import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const getCommand = defineCommand({
	meta: {
		name: "get",
		description: "Get a user by ID"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "User ID",
			required: true
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const user = await client.users.retrieve({ user_id: args.id })
			const u = user as {
				id: string
				type: string
				name: string | null
				avatar_url: string | null
				person?: { email?: string }
				bot?: { owner?: { type: string }; workspace_name?: string }
			}

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(user, format)
				return
			}

			const data: Record<string, unknown> = {
				id: u.id,
				name: u.name ?? "",
				type: u.type,
				avatar: u.avatar_url ?? ""
			}

			if (u.person) {
				data.email = u.person.email ?? ""
			}
			if (u.bot) {
				data.owner = u.bot.owner?.type ?? ""
				data.workspace = u.bot.workspace_name ?? ""
			}

			printOutput(data, format)
		} catch (error) {
			handleError(error)
		}
	}
})
