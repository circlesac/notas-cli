import { defineCommand } from "citty"
import { commonArgs, paginationArgs } from "../../../lib/args.ts"
import { getToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"
import { getOutputFormat, printOutput } from "../../../lib/output.ts"
import { createNotionClient } from "../client.ts"

export const listCommand = defineCommand({
	meta: {
		name: "list",
		description: "List all users in the workspace"
	},
	args: {
		...commonArgs,
		...paginationArgs,
		filter: {
			type: "string",
			description: "Filter users by name or email",
			alias: "f"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)
			const client = createNotionClient(token)

			const users: Record<string, unknown>[] = []
			let cursor: string | undefined = args.cursor

			do {
				const response = await client.users.list({
					page_size: args.limit ? parseInt(args.limit, 10) : 100,
					start_cursor: cursor
				})

				for (const user of response.results) {
					const u = user as {
						id: string
						type: string
						name: string | null
						avatar_url: string | null
						person?: { email?: string }
						bot?: { owner?: { type: string } }
					}

					users.push({
						id: u.id,
						name: u.name ?? "",
						type: u.type,
						email: u.person?.email ?? "",
						avatar: u.avatar_url ?? ""
					})
				}

				cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
			} while (cursor)

			const filtered = args.filter
				? users.filter((u) => {
						const q = args.filter!.toLowerCase()
						return String(u.name).toLowerCase().includes(q) || String(u.email).toLowerCase().includes(q)
					})
				: users

			printOutput(filtered, getOutputFormat(args), [
				{ key: "id", label: "ID" },
				{ key: "name", label: "Name" },
				{ key: "type", label: "Type" },
				{ key: "email", label: "Email" }
			])
		} catch (error) {
			handleError(error)
		}
	}
})
