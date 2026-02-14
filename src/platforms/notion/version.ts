import { defineCommand } from "citty"
import { commonArgs } from "../../lib/args.ts"
import { getToken } from "../../lib/credentials.ts"
import { handleError } from "../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../lib/output.ts"
import { createNotionClient } from "./client.ts"

export const versionCommand = defineCommand({
	meta: {
		name: "version",
		description: "Show connection info for the current workspace"
	},
	args: {
		...commonArgs
	},
	async run({ args }) {
		try {
			const { token, workspace } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const me = await client.users.me({})
			const u = me as {
				id: string
				type: string
				name: string | null
				bot?: { owner?: { type: string; workspace?: boolean }; workspace_name?: string }
			}

			const format = getOutputFormat(args)
			printOutput(
				{
					name: workspace,
					bot: u.name ?? "",
					"bot id": u.id,
					type: u.type,
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
