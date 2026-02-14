import { Client } from "@notionhq/client"
import { defineCommand } from "citty"
import { getIntegrationCredentials, storeCredentials, storeToken } from "../../../lib/credentials.ts"
import { handleError } from "../../../lib/errors.ts"

const REDIRECT_URI = "https://notas.circles.ac/callback"
const DEFAULT_CLIENT_ID = "306d872b-594c-806e-9733-0037c1f5a567"
const DEFAULT_CLIENT_SECRET = "secret_o0dF5SCyXimGyS7RJG6MjHZV6Yq35BhIjTg6yZHQDZT"

function randomPort(): number {
	return 49152 + Math.floor(Math.random() * 16384)
}

async function loginWithToken(token: string, name: string): Promise<void> {
	const client = new Client({ auth: token })
	const me = await client.users.me({})

	await storeToken(name, token)

	console.info(`\x1b[32m\u2713\x1b[0m Logged in as ${me.name ?? me.id} (workspace: ${name})`)
}

async function loginWithOAuth(clientId: string, clientSecret: string, nameOverride?: string): Promise<void> {
	const port = randomPort()
	const state = btoa(JSON.stringify({ p: port }))

	const authUrl = new URL("https://api.notion.com/v1/oauth/authorize")
	authUrl.searchParams.set("client_id", clientId)
	authUrl.searchParams.set("response_type", "code")
	authUrl.searchParams.set("owner", "user")
	authUrl.searchParams.set("redirect_uri", REDIRECT_URI)
	authUrl.searchParams.set("state", state)

	console.info("Opening browser for Notion authorization...")
	console.info(`Waiting for callback on http://localhost:${port}/callback...\n`)

	const code = await new Promise<string>((resolve, reject) => {
		const server = Bun.serve({
			port,
			async fetch(req) {
				const url = new URL(req.url)

				if (url.pathname !== "/callback") {
					return new Response("Not found", { status: 404 })
				}

				const error = url.searchParams.get("error")
				if (error) {
					clearTimeout(timer)
					reject(new Error(`OAuth denied: ${error}`))
					setTimeout(() => server.stop(), 100)
					return new Response("<html><body><h2>Authorization denied.</h2><p>You can close this tab.</p></body></html>", { headers: { "Content-Type": "text/html" } })
				}

				const authCode = url.searchParams.get("code")
				if (!authCode) {
					clearTimeout(timer)
					reject(new Error("No code in callback"))
					setTimeout(() => server.stop(), 100)
					return new Response("Missing code", { status: 400 })
				}

				clearTimeout(timer)
				resolve(authCode)
				setTimeout(() => server.stop(), 100)
				return new Response("<html><body><h2>Authorized!</h2><p>You can close this tab and return to the terminal.</p></body></html>", {
					headers: { "Content-Type": "text/html" }
				})
			}
		})

		const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"

		Bun.spawn([openCmd, authUrl.toString()], {
			stdout: "ignore",
			stderr: "ignore"
		})

		const timer = setTimeout(() => {
			server.stop()
			reject(new Error("OAuth timed out after 2 minutes"))
		}, 120_000)
	})

	console.info("Exchanging code for tokens...")

	const basicAuth = btoa(`${clientId}:${clientSecret}`)
	const response = await fetch("https://api.notion.com/v1/oauth/token", {
		method: "POST",
		headers: {
			Authorization: `Basic ${basicAuth}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT_URI
		})
	})

	const data = (await response.json()) as {
		access_token?: string
		token_type?: string
		bot_id?: string
		workspace_id?: string
		workspace_name?: string | null
		workspace_icon?: string | null
		refresh_token?: string | null
		owner?: { type: string; user?: { name: string | null; id: string } }
		error?: string
		message?: string
	}

	if (data.error || !data.access_token) {
		throw new Error(`Token exchange failed: ${data.error ?? data.message ?? "unknown error"}`)
	}

	const existing = data.workspace_id ? await getIntegrationCredentials(data.workspace_id) : null

	const slug = data.workspace_name
		? data.workspace_name
				.toLowerCase()
				.replace(/\s+/g, "-")
				.replace(/[^a-z0-9-]/g, "")
		: ""

	const name = nameOverride || existing?.name || slug || data.workspace_id || "default"

	await storeCredentials({
		name,
		token: data.access_token,
		refreshToken: data.refresh_token,
		workspaceId: data.workspace_id,
		workspaceName: data.workspace_name,
		botId: data.bot_id,
		tokenType: "oauth"
	})

	console.info(`\x1b[32m\u2713\x1b[0m Authorized! Token saved as "${name}" (workspace: "${data.workspace_name ?? name}")`)
	if (data.owner?.user?.name) {
		console.info(`  Owner: ${data.owner.user.name}`)
	}
}

export const loginCommand = defineCommand({
	meta: {
		name: "login",
		description: "Authenticate with Notion (OAuth or token)"
	},
	args: {
		token: {
			type: "string",
			description: "Notion token (ntn_... or secret_...) for manual auth",
			alias: "t"
		},
		name: {
			type: "string",
			description: "Name for this workspace (e.g. zigbang)",
			alias: "n"
		},
		"client-id": {
			type: "string",
			description: "OAuth client ID (or set NOTION_CLIENT_ID)"
		},
		"client-secret": {
			type: "string",
			description: "OAuth client secret (or set NOTION_CLIENT_SECRET)"
		}
	},
	async run({ args }) {
		// Manual token flow
		if (args.token) {
			try {
				await loginWithToken(args.token, args.name ?? "default")
			} catch (error) {
				handleError(error)
			}
			return
		}

		// OAuth flow (default)
		const clientId = args["client-id"] ?? process.env["NOTION_CLIENT_ID"] ?? DEFAULT_CLIENT_ID
		const clientSecret = args["client-secret"] ?? process.env["NOTION_CLIENT_SECRET"] ?? DEFAULT_CLIENT_SECRET

		try {
			await loginWithOAuth(clientId, clientSecret, args.name)
		} catch (error) {
			handleError(error)
		}
	}
})
