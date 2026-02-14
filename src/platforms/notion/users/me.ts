import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const meCommand = defineCommand({
	meta: {
		name: "me",
		description: "Get the current bot user"
	},
	args: {
		...commonArgs
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const me = await client.users.me({})
			const u = me as {
				id: string
				type: string
				name: string | null
				avatar_url: string | null
				bot?: { owner?: { type: string; workspace?: boolean }; workspace_name?: string }
			}

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(me, format)
				return
			}

			printOutput(
				{
					id: u.id,
					name: u.name ?? "",
					type: u.type,
					avatar: u.avatar_url ?? "",
					owner: u.bot?.owner?.type ?? "",
					workspace: u.bot?.workspace_name ?? ""
				},
				format
			)
		} catch (error) {
			handleError(error)
		}
	}
})
