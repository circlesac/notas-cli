import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { listIntegrations } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const statusCommand = defineCommand({
	meta: {
		name: "status",
		description: "Show authentication status for all workspaces"
	},
	args: {
		...commonArgs
	},
	async run({ args }) {
		try {
			const integrations = await listIntegrations()

			if (integrations.length === 0) {
				console.info("No workspaces configured. Run: notas notion auth login")
				return
			}

			const results: Record<string, unknown>[] = []

			for (const integration of integrations) {
				try {
					const client = createNotionClient(integration.token)
					const me = await client.users.me({})
					results.push({
						name: integration.name,
						status: "connected",
						bot: me.name ?? me.id,
						auth: integration.tokenType ?? "internal",
						workspace: integration.workspaceName ?? "-"
					})
				} catch {
					results.push({
						name: integration.name,
						status: "error",
						bot: "-",
						auth: integration.tokenType ?? "internal",
						workspace: integration.workspaceName ?? "-"
					})
				}
			}

			printOutput(results, getOutputFormat(args), [
				{ key: "name", label: "Workspace" },
				{ key: "status", label: "Status" },
				{ key: "bot", label: "Bot Name" },
				{ key: "auth", label: "Auth" },
				{ key: "workspace", label: "Workspace" }
			])
		} catch (error) {
			handleError(error)
		}
	}
})
