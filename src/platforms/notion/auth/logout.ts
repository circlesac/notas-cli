import { defineCommand } from "citty"
import { listIntegrations, removeIntegration } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"

export const logoutCommand = defineCommand({
	meta: {
		name: "logout",
		description: "Remove a stored workspace token"
	},
	args: {
		name: {
			type: "string",
			description: "Workspace name to remove",
			alias: "n"
		}
	},
	async run({ args }) {
		try {
			const name = args.name

			if (!name) {
				const workspaces = await listIntegrations()
				if (workspaces.length === 0) {
					console.info("No workspaces configured.")
					return
				}
				if (workspaces.length === 1) {
					const removed = await removeIntegration(workspaces[0]!.name)
					if (removed) {
						console.info(`\x1b[32m\u2713\x1b[0m Removed workspace: ${workspaces[0]!.name}`)
					}
					return
				}
				console.info("Multiple workspaces found. Specify one with --name:")
				for (const ws of workspaces) {
					console.info(`  - ${ws.name}`)
				}
				return
			}

			const removed = await removeIntegration(name)
			if (removed) {
				console.info(`\x1b[32m\u2713\x1b[0m Removed workspace: ${name}`)
			} else {
				console.error(`\x1b[31m\u2717\x1b[0m Workspace "${name}" not found`)
			}
		} catch (error) {
			handleError(error)
		}
	}
})
