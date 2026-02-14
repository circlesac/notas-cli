import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import type { NotionCliConfig } from "../types/index.ts"

const CONFIG_DIR = join(homedir(), ".config", "notas")
const CONFIG_FILE = join(CONFIG_DIR, "config.json")

export function getConfigDir(): string {
	return CONFIG_DIR
}

export async function ensureConfigDir(): Promise<void> {
	await mkdir(CONFIG_DIR, { recursive: true })
}

export async function readConfig(): Promise<NotionCliConfig> {
	try {
		const content = await readFile(CONFIG_FILE, "utf-8")
		return JSON.parse(content) as NotionCliConfig
	} catch {
		return {}
	}
}

export async function writeConfig(config: NotionCliConfig): Promise<void> {
	await ensureConfigDir()
	await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n")
}
