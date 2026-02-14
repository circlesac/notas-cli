import { Client } from "@notionhq/client"

export function createNotionClient(token: string): Client {
	return new Client({ auth: token })
}

export async function notionFetch(token: string, path: string, body?: unknown): Promise<unknown> {
	const response = await fetch(`https://api.notion.com${path}`, {
		method: body ? "POST" : "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"Notion-Version": "2022-06-28"
		},
		...(body ? { body: JSON.stringify(body) } : {})
	})
	return response.json()
}
