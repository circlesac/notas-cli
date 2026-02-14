import { defineCommand } from "citty"
import { renameIntegration } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"

export const renameCommand = defineCommand({
	meta: {
		name: "rename",
		description: "Rename a workspace"
	},
	args: {
		from: {
			type: "positional",
			description: "Current workspace name",
			required: true
		},
		to: {
			type: "positional",
			description: "New workspace name",
			required: true
		}
	},
	async run({ args }) {
		try {
			await renameIntegration(args.from, args.to)
			console.info(`\x1b[32m\u2713\x1b[0m Renamed "${args.from}" → "${args.to}"`)
		} catch (error) {
			handleError(error)
		}
	}
})
