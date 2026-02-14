export const commonArgs = {
	workspace: {
		type: "string" as const,
		description: "Workspace name",
		alias: "w"
	},
	json: { type: "boolean" as const, description: "Output as JSON" },
	plain: { type: "boolean" as const, description: "Output as plain text" }
}

export const stdinArgs = {
	stdio: { type: "boolean" as const, description: "Read content from stdin" }
}

export const paginationArgs = {
	limit: {
		type: "string" as const,
		description: "Number of items to return (default 100)"
	},
	all: {
		type: "boolean" as const,
		description: "Auto-paginate to fetch all results"
	},
	cursor: {
		type: "string" as const,
		description: "Pagination cursor for next page"
	}
}
