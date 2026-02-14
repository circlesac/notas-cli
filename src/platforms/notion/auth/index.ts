import { defineCommand } from "citty"
import { loginCommand } from "./login.ts"
import { logoutCommand } from "./logout.ts"
import { refreshCommand } from "./refresh.ts"
import { renameCommand } from "./rename.ts"
import { statusCommand } from "./status.ts"

export const authCommand = defineCommand({
	meta: {
		name: "auth",
		description: "Manage Notion authentication"
	},
	subCommands: {
		login: loginCommand,
		logout: logoutCommand,
		refresh: refreshCommand,
		rename: renameCommand,
		status: statusCommand
	}
})
