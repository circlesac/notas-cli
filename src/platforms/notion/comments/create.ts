import { defineCommand } from "citty"
import { commonArgs, stdinArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const createCommand = defineCommand({
	meta: {
		name: "create",
		description: "Add a comment to a page or discussion"
	},
	args: {
		...commonArgs,
		...stdinArgs,
		"page-id": {
			type: "string",
			description: "Page ID (starts a new discussion)"
		},
		"discussion-id": {
			type: "string",
			description: "Discussion thread ID (replies to existing)"
		},
		text: {
			type: "string",
			description: "Comment text"
		}
	},
	async run({ args }) {
		try {
			if (args.stdio && args.text) {
				console.error("\x1b[31m\u2717\x1b[0m Cannot use both --stdio and --text")
				process.exit(1)
			}

			let text = args.text
			if (!text && args.stdio) {
				text = (await Bun.stdin.text()).trimEnd()
			}

			if (!text) {
				console.error("\x1b[31m\u2717\x1b[0m No comment text provided. Use --text or --stdio")
				process.exit(1)
			}

			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const richText = [{ type: "text" as const, text: { content: text } }]

			let comment
			if (args["discussion-id"]) {
				comment = await client.comments.create({
					discussion_id: args["discussion-id"],
					rich_text: richText
				})
			} else if (args["page-id"]) {
				comment = await client.comments.create({
					parent: { page_id: args["page-id"] },
					rich_text: richText
				})
			} else {
				console.error("\x1b[31m\u2717\x1b[0m Provide either --page-id or --discussion-id")
				process.exit(1)
			}

			const format = getOutputFormat(args)
			if (format === "json") {
				printOutput(comment, format)
				return
			}

			const c = comment as { id: string }
			console.info(`\x1b[32m\u2713\x1b[0m Comment created: ${c.id}`)
		} catch (error) {
			handleError(error)
		}
	}
})
