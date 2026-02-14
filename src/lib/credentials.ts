import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import type { IntegrationCredentials } from "../types/index.ts"
import { AuthError } from "./errors.ts"

const CREDENTIALS_DIR = join(homedir(), ".config", "notas", "credentials")

async function ensureCredentialsDir(): Promise<void> {
	await mkdir(CREDENTIALS_DIR, { recursive: true })
}

function fileId(creds: IntegrationCredentials): string {
	return creds.workspaceId ?? creds.name
}

export async function storeCredentials(creds: IntegrationCredentials): Promise<void> {
	await ensureCredentialsDir()
	const filePath = join(CREDENTIALS_DIR, `${fileId(creds)}.json`)
	await writeFile(filePath, JSON.stringify(creds, null, 2) + "\n")
}

export async function storeToken(name: string, token: string): Promise<void> {
	await storeCredentials({ name, token, tokenType: "internal" })
}

export async function listIntegrations(): Promise<IntegrationCredentials[]> {
	try {
		await ensureCredentialsDir()
		const files = await readdir(CREDENTIALS_DIR)
		const integrations: IntegrationCredentials[] = []
		for (const file of files) {
			if (!file.endsWith(".json")) continue
			const content = await readFile(join(CREDENTIALS_DIR, file), "utf-8")
			integrations.push(JSON.parse(content) as IntegrationCredentials)
		}
		return integrations
	} catch {
		return []
	}
}

export async function getIntegrationCredentials(nameOrId: string): Promise<IntegrationCredentials | null> {
	const integrations = await listIntegrations()
	return integrations.find((c) => c.name === nameOrId || c.workspaceId === nameOrId) ?? null
}

export async function renameIntegration(oldName: string, newName: string): Promise<void> {
	const creds = await getIntegrationCredentials(oldName)
	if (!creds) throw new AuthError(`Workspace "${oldName}" not found`)
	creds.name = newName
	await storeCredentials(creds)
}

export async function removeIntegration(nameOrId: string): Promise<boolean> {
	const creds = await getIntegrationCredentials(nameOrId)
	if (!creds) return false
	try {
		const filePath = join(CREDENTIALS_DIR, `${fileId(creds)}.json`)
		await unlink(filePath)
		return true
	} catch {
		return false
	}
}

export async function getToken(workspace: string | undefined): Promise<{ token: string; workspace: string }> {
	const envToken = process.env["NOTION_TOKEN"]
	if (envToken) {
		return { token: envToken, workspace: "env" }
	}

	const workspaces = await listIntegrations()

	if (workspace) {
		const creds = await getIntegrationCredentials(workspace)
		if (!creds) {
			throw new AuthError(`Workspace "${workspace}" not found. Run: notas notion auth login`)
		}
		return { token: creds.token, workspace: creds.name }
	}

	if (workspaces.length === 0) {
		throw new AuthError("No workspaces configured. Run: notas notion auth login")
	}

	if (workspaces.length === 1) {
		const creds = workspaces[0]!
		return { token: creds.token, workspace: creds.name }
	}

	throw new AuthError(`Multiple workspaces configured. Use --workspace to specify: ${workspaces.map((w) => w.name).join(", ")}`)
}
