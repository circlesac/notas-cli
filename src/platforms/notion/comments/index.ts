import { defineCommand } from "citty"
import { createCommand } from "./create.ts"
import { listCommand } from "./list.ts"

export const commentsCommand = defineCommand({
	meta: {
		name: "comments",
		description: "Manage comments on pages and blocks"
	},
	subCommands: {
		list: listCommand,
		create: createCommand
	}
})
