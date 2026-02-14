import { defineCommand } from "citty"
import { createCommand } from "./create.ts"
import { deleteCommand } from "./delete.ts"
import { getCommand } from "./get.ts"
import { listCommand } from "./list.ts"
import { queryCommand } from "./query.ts"
import { updateCommand } from "./update.ts"

export const databasesCommand = defineCommand({
	meta: {
		name: "databases",
		description: "Manage Notion databases"
	},
	subCommands: {
		list: listCommand,
		get: getCommand,
		create: createCommand,
		update: updateCommand,
		query: queryCommand,
		delete: deleteCommand
	}
})
