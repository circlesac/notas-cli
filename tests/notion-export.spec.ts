import { describe, expect, it } from "vitest"
import { extOf, mediaFilename, sanitizeMediaFilename } from "../src/platforms/notion/pages/export.ts"

describe("notion page export media filenames", () => {
	it("extracts compact URL extensions only", () => {
		expect(extOf("https://example.com/file.pdf?download=1")).toBe(".pdf")
		expect(extOf("https://example.com/file.longextension")).toBe("")
		expect(extOf("not a url")).toBe("")
	})

	it("sanitizes unsafe names without stripping useful Korean filenames", () => {
		expect(sanitizeMediaFilename(" 관리사무소_매뉴얼.pdf ")).toBe("관리사무소_매뉴얼.pdf")
		expect(sanitizeMediaFilename("../bad/name\u0000.pdf")).toBe("..-bad-name-.pdf")
		expect(sanitizeMediaFilename("..")).toBe("file")
		expect(sanitizeMediaFilename(" \n\t ")).toBe("file")
	})

	it("uses the Notion file name and appends the URL extension when missing", () => {
		expect(mediaFilename("12345678-1234-1234-1234-123456789abc", "https://example.com/hash.pdf", "관리사무소_매뉴얼.pdf", new Set())).toBe("관리사무소_매뉴얼.pdf")
		expect(mediaFilename("12345678-1234-1234-1234-123456789abd", "https://example.com/hash.pdf", "관리사무소_매뉴얼", new Set())).toBe("관리사무소_매뉴얼.pdf")
	})

	it("deduplicates repeated file names with a stable block suffix", () => {
		const usedNames = new Set<string>()

		expect(mediaFilename("12345678-1234-1234-1234-123456789abc", "https://example.com/hash.pdf", "manual.pdf", usedNames)).toBe("manual.pdf")
		expect(mediaFilename("12345678-1234-1234-1234-123456789abd", "https://example.com/hash.pdf", "manual.pdf", usedNames)).toBe("manual-123456789abd.pdf")
	})

	it("falls back to the block id when Notion has no useful name", () => {
		const usedNames = new Set<string>()

		expect(mediaFilename("12345678-1234-1234-1234-123456789abc", "https://example.com/hash", undefined, usedNames)).toBe("12345678123412341234123456789abc.bin")
	})
})
