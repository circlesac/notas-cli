type PropertyValue = {
	id: string
	type: string
	[key: string]: unknown
}

export function extractTitle(properties: Record<string, PropertyValue>): string {
	for (const prop of Object.values(properties)) {
		if (prop.type === "title") {
			const titleArr = prop.title as Array<{ plain_text: string }> | undefined
			if (titleArr && titleArr.length > 0) {
				return titleArr.map((t) => t.plain_text).join("")
			}
		}
	}
	return ""
}

export function extractPropertyValue(prop: PropertyValue): string {
	switch (prop.type) {
		case "title": {
			const titleArr = prop.title as Array<{ plain_text: string }> | undefined
			return titleArr?.map((t) => t.plain_text).join("") ?? ""
		}
		case "rich_text": {
			const richArr = prop.rich_text as Array<{ plain_text: string }> | undefined
			return richArr?.map((t) => t.plain_text).join("") ?? ""
		}
		case "number":
			return String(prop.number ?? "")
		case "select": {
			const sel = prop.select as { name: string } | null
			return sel?.name ?? ""
		}
		case "multi_select": {
			const multi = prop.multi_select as Array<{ name: string }> | undefined
			return multi?.map((s) => s.name).join(", ") ?? ""
		}
		case "date": {
			const date = prop.date as { start: string; end?: string } | null
			if (!date) return ""
			return date.end ? `${date.start} - ${date.end}` : date.start
		}
		case "checkbox":
			return prop.checkbox ? "true" : "false"
		case "url":
			return String(prop.url ?? "")
		case "email":
			return String(prop.email ?? "")
		case "phone_number":
			return String(prop.phone_number ?? "")
		case "formula": {
			const formula = prop.formula as { type: string; [key: string]: unknown } | undefined
			if (!formula) return ""
			return String(formula[formula.type] ?? "")
		}
		case "relation": {
			const rels = prop.relation as Array<{ id: string }> | undefined
			return rels?.map((r) => r.id).join(", ") ?? ""
		}
		case "rollup": {
			const rollup = prop.rollup as { type: string; [key: string]: unknown } | undefined
			if (!rollup) return ""
			return String(rollup[rollup.type] ?? "")
		}
		case "people": {
			const people = prop.people as Array<{ name?: string; id: string }> | undefined
			return people?.map((p) => p.name ?? p.id).join(", ") ?? ""
		}
		case "files": {
			const files = prop.files as Array<{ name: string }> | undefined
			return files?.map((f) => f.name).join(", ") ?? ""
		}
		case "created_time":
			return String(prop.created_time ?? "")
		case "created_by": {
			const creator = prop.created_by as { name?: string; id: string } | undefined
			return creator?.name ?? creator?.id ?? ""
		}
		case "last_edited_time":
			return String(prop.last_edited_time ?? "")
		case "last_edited_by": {
			const editor = prop.last_edited_by as { name?: string; id: string } | undefined
			return editor?.name ?? editor?.id ?? ""
		}
		case "status": {
			const status = prop.status as { name: string } | null
			return status?.name ?? ""
		}
		case "unique_id": {
			const uid = prop.unique_id as { prefix?: string; number: number } | undefined
			if (!uid) return ""
			return uid.prefix ? `${uid.prefix}-${uid.number}` : String(uid.number)
		}
		default:
			return JSON.stringify(prop[prop.type] ?? "")
	}
}

export function flattenProperties(properties: Record<string, PropertyValue>): Record<string, string> {
	const result: Record<string, string> = {}
	for (const [name, prop] of Object.entries(properties)) {
		result[name] = extractPropertyValue(prop)
	}
	return result
}

export function extractBlockText(block: { type: string; [key: string]: unknown }): string {
	const content = block[block.type] as { rich_text?: Array<{ plain_text: string }>; text?: Array<{ plain_text: string }> } | undefined
	if (!content) return ""

	const textArr = content.rich_text ?? content.text
	if (!textArr) return ""
	return textArr.map((t) => t.plain_text).join("")
}
