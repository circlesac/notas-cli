import { defineCommand } from "citty"
import { archiveCommand } from "./archive.ts"
import { createCommand } from "./create.ts"
import { getCommand } from "./get.ts"
import { restoreCommand } from "./restore.ts"
import { updateCommand } from "./update.ts"

export const pagesCommand = defineCommand({
	meta: {
		name: "pages",
		description: "Manage Notion pages"
	},
	subCommands: {
		get: getCommand,
		create: createCommand,
		update: updateCommand,
		archive: archiveCommand,
		restore: restoreCommand
	}
})
