import { defineCommand } from "citty"
import { commonArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const updateCommand = defineCommand({
	meta: {
		name: "update",
		description: "Update page properties"
	},
	args: {
		...commonArgs,
		id: {
			type: "positional",
			description: "Page ID",
			required: true
		},
		title: {
			type: "string",
			description: "New page title"
		},
		icon: {
			type: "string",
			description: "New icon emoji"
		},
		cover: {
			type: "string",
			description: "New cover image URL"
		},
		properties: {
			type: "string",
			description: "Properties to update as JSON"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const updateParams: Record<string, unknown> = {
				page_id: args.id
			}

			const properties: Record<string, unknown> = args.properties ? JSON.parse(args.properties) : {}

			if (args.title) {
				properties["title"] = {
					title: [{ type: "text", text: { content: args.title } }]
				}
			}

			if (Object.keys(properties).length > 0) {
				updateParams.properties = properties
			}

			if (args.icon) {
				updateParams.icon = { type: "emoji", emoji: args.icon }
			}

			if (args.cover) {
				updateParams.cover = {
					type: "external",
					external: { url: args.cover }
				}
			}

			const page = await client.pages.update(updateParams as Parameters<typeof client.pages.update>[0])

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(page, format)
				return
			}

			console.info(`\x1b[32m\u2713\x1b[0m Page updated: ${args.id}`)
		} catch (error) {
			handleError(error)
		}
	}
})
