# AI Coding Agent Rules

## Project

- **Runtime**: Bun
- **CLI framework**: citty (defineCommand)
- **Linting**: `bun run lint` (oxlint + eslint + prettier + biome + tsc)
- **Testing**: vitest
- **Versioning**: CalVer via `@circlesac/oneup`

## Conventions

- Tabs for indentation, no semicolons, double quotes
- All commands follow the pattern: `defineCommand` with `commonArgs`, `handleError`, `getOutputFormat`/`printOutput`
- Primary ID arguments use `type: "positional"`
- Credentials stored at `~/.config/notas/credentials/`
- Output formats: table (default), `--json`, `--plain`
