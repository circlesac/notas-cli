import { defineCommand, runMain } from "citty"
import pkg from "../package.json"
import { checkForUpdate } from "./lib/update-check.ts"
import { notionCommand } from "./platforms/notion/index.ts"

const version = (pkg as { version?: string }).version ?? "0.0.0"

const main = defineCommand({
	meta: {
		name: pkg.name,
		version,
		description: "Multi-provider notes & docs CLI"
	},
	subCommands: {
		notion: notionCommand
	}
})

await checkForUpdate()
runMain(main)
