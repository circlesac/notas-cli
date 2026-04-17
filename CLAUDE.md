# AI Coding Agent Rules

## Release

Releases go through GitHub Actions. Do NOT manually bump versions or publish.

```bash
# 1. Run tests
bun run test

# 2. Push changes to main
git push origin main

# 3. Trigger release workflow
gh workflow run release.yml

# 4. Monitor until completion — do NOT return to user until done
RUN_ID=$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status

# 5. If failed, check logs, fix, and re-release
gh run view "$RUN_ID" --log-failed

# 6. After success, update local binary
brew update && brew upgrade circlesac/tap/notas
```

The workflow bumps CalVer via `@circlesac/oneup`, builds multi-platform binaries (darwin/linux, x64+arm64), creates a GitHub release, publishes to npm, and updates the Homebrew tap.

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
