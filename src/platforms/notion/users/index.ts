import { defineCommand } from "citty"
import { getCommand } from "./get.ts"
import { listCommand } from "./list.ts"
import { meCommand } from "./me.ts"

export const usersCommand = defineCommand({
	meta: {
		name: "users",
		description: "Manage workspace users"
	},
	subCommands: {
		list: listCommand,
		get: getCommand,
		me: meCommand
	}
})
