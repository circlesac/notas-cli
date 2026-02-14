import { defineCommand } from "citty"
import { getToken } from "../../lib/credentials.ts"
import { handleError } from "../../lib/errors.ts"

function toCamelCase(str: string): string {
	return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

export const apiCommand = defineCommand({
	meta: {
		name: "api",
		description: "Make raw Notion API calls (e.g., notion api POST /v1/databases/ID/query --body '{}')"
	},
	args: {
		workspace: {
			type: "string",
			description: "Workspace name",
			alias: "w"
		},
		body: {
			type: "string",
			description: "Request body as JSON",
			alias: "b"
		}
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace)

			const rawArgs = process.argv.slice(process.argv.indexOf("api") + 1)

			let method = "GET"
			let path = ""
			const params: Record<string, unknown> = {}
			let bodyStr = args.body

			let i = 0
			while (i < rawArgs.length) {
				const arg = rawArgs[i]!

				if (i === 0 && ["GET", "POST", "PATCH", "PUT", "DELETE"].includes(arg.toUpperCase())) {
					method = arg.toUpperCase()
					i++
					continue
				}

				if ((i === 0 || i === 1) && arg.startsWith("/")) {
					path = arg
					i++
					continue
				}

				if (arg === "--body" || arg === "-b") {
					bodyStr = rawArgs[++i]
					i++
					continue
				}

				if (arg === "--workspace" || arg === "-w") {
					i += 2
					continue
				}

				if (arg.startsWith("--")) {
					const key = toCamelCase(arg.slice(2))
					const nextArg = rawArgs[i + 1]
					if (nextArg && !nextArg.startsWith("--")) {
						try {
							params[key] = JSON.parse(nextArg)
						} catch {
							params[key] = nextArg
						}
						i += 2
					} else {
						params[key] = true
						i++
					}
					continue
				}

				if (arg.startsWith("{") || arg.startsWith("[")) {
					bodyStr = arg
					i++
					continue
				}

				if (!path) {
					path = arg
				}
				i++
			}

			if (!path) {
				console.error("\x1b[31m\u2717\x1b[0m Usage: notion api [METHOD] /v1/endpoint [--key value] [--body '{}']")
				console.error("")
				console.error("Examples:")
				console.error("  notion api GET /v1/users")
				console.error('  notion api POST /v1/search --body \'{"query":"test"}\'')
				console.error("  notion api GET /v1/databases/DB_ID")
				console.error("  notion api POST /v1/databases/DB_ID/query '{\"page_size\":10}'")
				process.exit(1)
			}

			const url = path.startsWith("http") ? path : `https://api.notion.com${path}`

			const fetchOptions: RequestInit = {
				method,
				headers: {
					Authorization: `Bearer ${token}`,
					"Notion-Version": "2022-06-28",
					"Content-Type": "application/json"
				}
			}

			if (method !== "GET" && method !== "HEAD") {
				const body = bodyStr ? { ...JSON.parse(bodyStr), ...params } : Object.keys(params).length > 0 ? params : undefined
				if (body) {
					fetchOptions.body = JSON.stringify(body)
				}
			}

			const response = await fetch(url, fetchOptions)
			const data = await response.json()

			if (!response.ok) {
				console.error(`\x1b[31m\u2717\x1b[0m ${response.status} ${response.statusText}`)
			}

			console.info(JSON.stringify(data, null, 2))
		} catch (error) {
			handleError(error)
		}
	}
})
