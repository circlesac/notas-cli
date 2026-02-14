import { defineCommand } from "citty"
import { appendCommand } from "./append.ts"
import { deleteCommand } from "./delete.ts"
import { getCommand } from "./get.ts"
import { listCommand } from "./list.ts"
import { updateCommand } from "./update.ts"

export const blocksCommand = defineCommand({
	meta: {
		name: "blocks",
		description: "Manage Notion blocks (content)"
	},
	subCommands: {
		list: listCommand,
		get: getCommand,
		append: appendCommand,
		update: updateCommand,
		delete: deleteCommand
	}
})
