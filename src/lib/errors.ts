export class NotionCliError extends Error {
	constructor(
		message: string,
		public code: string
	) {
		super(message)
		this.name = "NotionCliError"
	}
}

export class AuthError extends NotionCliError {
	constructor(message: string) {
		super(message, "AUTH_ERROR")
		this.name = "AuthError"
	}
}

export class NotionApiError extends NotionCliError {
	constructor(
		message: string,
		public notionError?: string
	) {
		super(message, "NOTION_API_ERROR")
		this.name = "NotionApiError"
	}
}

export function handleError(error: unknown): never {
	if (error instanceof NotionCliError) {
		console.error(`\x1b[31m\u2717\x1b[0m ${error.message}`)
	} else if (error instanceof Error) {
		const msg = error.message
		if (msg.includes("Could not find")) {
			console.error(`\x1b[31m\u2717\x1b[0m Not found: ${msg}`)
		} else if (msg.includes("unauthorized") || msg.includes("Unauthorized")) {
			console.error(`\x1b[31m\u2717\x1b[0m Authentication failed: ${msg}`)
		} else {
			console.error(`\x1b[31m\u2717\x1b[0m ${msg}`)
		}
	} else {
		console.error(`\x1b[31m\u2717\x1b[0m An unknown error occurred`)
	}
	process.exit(1)
}
