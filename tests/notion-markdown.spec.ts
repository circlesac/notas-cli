import { describe, expect, it } from "vitest"
import { type NotionBlock, renderBlocks } from "../src/platforms/notion/markdown.ts"

const annotations = {
	bold: false,
	italic: false,
	strikethrough: false,
	underline: false,
	code: false,
	color: "default"
}

function text(plain_text: string) {
	return {
		type: "text",
		plain_text,
		annotations
	}
}

describe("notion markdown rendering", () => {
	it("keeps markdown tables valid when cells contain newlines", () => {
		const blocks: NotionBlock[] = [
			{
				id: "table-1",
				type: "table",
				has_children: true,
				table: { has_column_header: true },
				children: [
					{
						id: "row-1",
						type: "table_row",
						has_children: false,
						table_row: { cells: [[text("Auth")], [text("Description")]] }
					},
					{
						id: "row-2",
						type: "table_row",
						has_children: false,
						table_row: { cells: [[text("ES256")], [text("비대칭키 JWT 이용\n(ES256)")]] }
					}
				]
			}
		]

		expect(renderBlocks(blocks, {})).toBe(["| Auth | Description |", "| --- | --- |", "| ES256 | 비대칭키 JWT 이용<br>(ES256) |"].join("\n"))
	})

	it("passes Notion file names to the media resolver and uses them as link text", () => {
		const seen: Array<string | undefined> = []
		const blocks: NotionBlock[] = [
			{
				id: "12345678-1234-1234-1234-123456789abc",
				type: "file",
				has_children: false,
				file: {
					type: "file",
					name: "관리사무소_매뉴얼.pdf",
					file: { url: "https://example.com/hash.pdf" },
					caption: []
				}
			}
		]

		const markdown = renderBlocks(blocks, {
			resolveMedia(_blockId, _url, suggestedName) {
				seen.push(suggestedName)
				return `_images/${suggestedName}`
			}
		})

		expect(seen).toEqual(["관리사무소_매뉴얼.pdf"])
		expect(markdown).toBe("[관리사무소_매뉴얼.pdf](_images/관리사무소_매뉴얼.pdf)")
	})
})
