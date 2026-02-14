import { defineCommand, runMain } from "citty"
import pkg from "../package.json"
import { notionCommand } from "./platforms/notion/index.ts"

const main = defineCommand({
	meta: {
		name: pkg.name,
		version: pkg.version,
		description: "Multi-provider notes & docs CLI"
	},
	subCommands: {
		notion: notionCommand
	}
})

runMain(main)
