import { defineCommand } from "citty"
import { apiCommand } from "./api.ts"
import { authCommand } from "./auth/index.ts"
import { blocksCommand } from "./blocks/index.ts"
import { commentsCommand } from "./comments/index.ts"
import { databasesCommand } from "./databases/index.ts"
import { pagesCommand } from "./pages/index.ts"
import { searchCommand } from "./search/search.ts"
import { usersCommand } from "./users/index.ts"
import { versionCommand } from "./version.ts"

export const notionCommand = defineCommand({
	meta: {
		name: "notion",
		description: "Notion platform commands"
	},
	subCommands: {
		auth: authCommand,
		databases: databasesCommand,
		db: databasesCommand,
		pages: pagesCommand,
		blocks: blocksCommand,
		users: usersCommand,
		search: searchCommand,
		comments: commentsCommand,
		api: apiCommand,
		version: versionCommand
	}
})
