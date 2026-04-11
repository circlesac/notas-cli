import { type ArgsDef, type CommandContext, type CommandDef, defineCommand } from "citty"
import { handleError, NotionCliError } from "./errors.ts"

type DeclaredArg = {
	type?: string
	alias?: string | string[]
	[key: string]: unknown
}

const INTERNAL_KEYS = new Set(["_", "--"])

export function assertKnownArgs(args: Record<string, unknown>, declared: Record<string, DeclaredArg>): void {
	const allowed = new Set<string>(INTERNAL_KEYS)
	for (const [name, def] of Object.entries(declared)) {
		allowed.add(name)
		const camel = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
		if (camel !== name) allowed.add(camel)
		const alias = def?.alias
		if (typeof alias === "string") allowed.add(alias)
		else if (Array.isArray(alias)) for (const a of alias) allowed.add(a)
	}

	const unknown: string[] = []
	for (const key of Object.keys(args)) {
		if (!allowed.has(key)) unknown.push(key)
	}

	if (unknown.length > 0) {
		const formatted = unknown.map((k) => (k.length === 1 ? `-${k}` : `--${k}`)).join(", ")
		throw new NotionCliError(`Unknown option${unknown.length > 1 ? "s" : ""}: ${formatted}`, "UNKNOWN_OPTION")
	}
}

export function defineLeafCommand<const T extends ArgsDef = ArgsDef>(def: CommandDef<T>): CommandDef<T> {
	const declared = (def.args ?? {}) as unknown as Record<string, DeclaredArg>
	const originalRun = def.run
	if (originalRun) {
		def.run = async (ctx: CommandContext<T>) => {
			try {
				assertKnownArgs(ctx.args as Record<string, unknown>, declared)
			} catch (error) {
				handleError(error)
			}
			return originalRun(ctx)
		}
	}
	return defineCommand(def)
}
