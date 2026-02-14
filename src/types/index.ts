export type OutputFormat = "table" | "json" | "plain"

export interface NotionCliConfig {
	outputFormat?: OutputFormat
}

export interface IntegrationCredentials {
	name: string
	token: string
	refreshToken?: string | null
	workspaceId?: string
	workspaceName?: string | null
	botId?: string
	tokenType?: "oauth" | "internal"
}

export interface CacheEntry<T> {
	data: T
	expiresAt: number
}
