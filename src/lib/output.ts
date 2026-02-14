import type { OutputFormat } from "../types/index.ts"

interface Column {
	key: string
	label: string
	width?: number
}

function truncate(str: string, maxWidth: number): string {
	if (str.length <= maxWidth) return str
	return str.slice(0, maxWidth - 1) + "\u2026"
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (typeof value === "object") return JSON.stringify(value)
	return String(value)
}

function formatTable(data: unknown, columns?: Column[]): string {
	if (Array.isArray(data)) {
		if (data.length === 0) return "No results found."
		return formatArrayTable(data as Record<string, unknown>[], columns)
	}
	if (typeof data === "object" && data !== null) {
		return formatObjectTable(data as Record<string, unknown>)
	}
	return String(data)
}

function formatArrayTable(data: Record<string, unknown>[], columns?: Column[]): string {
	const cols: Column[] = columns ?? Object.keys(data[0]!).map((key) => ({ key, label: key }))

	const colWidths = cols.map((col) => {
		const headerLen = col.label.length
		const maxDataLen = data.reduce((max, row) => {
			const val = formatValue(row[col.key])
			return Math.max(max, val.length)
		}, 0)
		return col.width ?? Math.min(Math.max(headerLen, maxDataLen), 60)
	})

	const lines: string[] = []

	const header = cols.map((col, i) => `\x1b[1m${col.label.padEnd(colWidths[i]!)}\x1b[0m`).join("  ")
	lines.push(header)

	const divider = colWidths.map((w) => "\u2500".repeat(w)).join("  ")
	lines.push(divider)

	for (const row of data) {
		const line = cols
			.map((col, i) => {
				const val = formatValue(row[col.key])
				return truncate(val, colWidths[i]!).padEnd(colWidths[i]!)
			})
			.join("  ")
		lines.push(line)
	}

	return lines.join("\n")
}

function formatObjectTable(data: Record<string, unknown>): string {
	const keys = Object.keys(data)
	const maxKeyLen = Math.max(...keys.map((k) => k.length))

	return keys
		.map((key) => {
			const val = formatValue(data[key])
			return `\x1b[1m${key.padEnd(maxKeyLen)}\x1b[0m  ${val}`
		})
		.join("\n")
}

function formatPlain(data: unknown, columns?: { key: string; label: string; width?: number }[]): string {
	if (Array.isArray(data)) {
		if (data.length === 0) return ""
		const cols =
			columns ??
			Object.keys((data[0] as Record<string, unknown>)!).map((key) => ({
				key,
				label: key
			}))
		return data.map((row: Record<string, unknown>) => cols.map((col) => formatValue(row[col.key])).join("\t")).join("\n")
	}
	if (typeof data === "object" && data !== null) {
		return Object.entries(data as Record<string, unknown>)
			.map(([key, val]) => `${key}\t${formatValue(val)}`)
			.join("\n")
	}
	return String(data)
}

export function formatOutput(data: unknown, format: OutputFormat, columns?: Column[]): string {
	switch (format) {
		case "json":
			return JSON.stringify(data, null, 2)
		case "plain":
			return formatPlain(data, columns)
		case "table":
		default:
			return formatTable(data, columns)
	}
}

export function printOutput(data: unknown, format: OutputFormat, columns?: Column[]): void {
	console.info(formatOutput(data, format, columns))
}

export function getOutputFormat(args: { json?: boolean; plain?: boolean }): OutputFormat {
	if (args.json) return "json"
	if (args.plain) return "plain"
	return "table"
}
