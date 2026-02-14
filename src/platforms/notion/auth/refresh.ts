import { defineCommand } from "citty"
import { getIntegrationCredentials, listIntegrations, storeCredentials } from "../../../lib/credentials.ts"
import { AuthError, handleError } from "../../../lib/errors.ts"

export const refreshCommand = defineCommand({
	meta: {
		name: "refresh",
		description: "Refresh an OAuth token"
	},
	args: {
		name: {
			type: "string",
			description: "Workspace name to refresh",
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
		try {
			let creds = args.name ? await getIntegrationCredentials(args.name) : null

			if (!creds) {
				const all = await listIntegrations()
				const oauthCreds = all.filter((c) => c.tokenType === "oauth")
				if (oauthCreds.length === 0) {
					throw new AuthError("No OAuth workspaces found. Run: notas notion auth login --client-id ... --client-secret ...")
				}
				if (oauthCreds.length > 1) {
					throw new AuthError(`Multiple OAuth workspaces found. Use --name to specify: ${oauthCreds.map((c) => c.name).join(", ")}`)
				}
				creds = oauthCreds[0]!
			}

			if (creds.tokenType !== "oauth") {
				throw new AuthError(`Workspace "${creds.name}" uses an internal token, not OAuth. No refresh needed.`)
			}

			if (!creds.refreshToken) {
				throw new AuthError(`Workspace "${creds.name}" has no refresh token stored.`)
			}

			const clientId = args["client-id"] ?? process.env["NOTION_CLIENT_ID"]
			const clientSecret = args["client-secret"] ?? process.env["NOTION_CLIENT_SECRET"]

			if (!clientId || !clientSecret) {
				throw new AuthError("OAuth client ID and secret required. Use --client-id/--client-secret or set NOTION_CLIENT_ID/NOTION_CLIENT_SECRET.")
			}

			const basicAuth = btoa(`${clientId}:${clientSecret}`)
			const response = await fetch("https://api.notion.com/v1/oauth/token", {
				method: "POST",
				headers: {
					Authorization: `Basic ${basicAuth}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					grant_type: "refresh_token",
					refresh_token: creds.refreshToken
				})
			})

			const data = (await response.json()) as {
				access_token?: string
				refresh_token?: string | null
				bot_id?: string
				workspace_id?: string
				workspace_name?: string | null
				error?: string
				message?: string
			}

			if (data.error || !data.access_token) {
				throw new Error(`Token refresh failed: ${data.error ?? data.message ?? "unknown error"}`)
			}

			await storeCredentials({
				...creds,
				token: data.access_token,
				refreshToken: data.refresh_token ?? creds.refreshToken,
				workspaceId: data.workspace_id ?? creds.workspaceId,
				workspaceName: data.workspace_name ?? creds.workspaceName,
				botId: data.bot_id ?? creds.botId
			})

			console.info(`\x1b[32m\u2713\x1b[0m Token refreshed for "${creds.name}"`)
		} catch (error) {
			handleError(error)
		}
	}
})
