# notas

Multi-provider notes & docs CLI. Notion is the first supported provider.

## Install

```bash
# Homebrew
brew install circlesac/tap/notas

# npm
npx @circlesac/notas

# From source
bun install
bun run build
```

## Usage

```bash
# Authenticate (opens browser for OAuth)
notas notion auth login

# Or use an integration token
notas notion auth login --token ntn_xxx

# List databases
notas notion db list

# Query a database
notas notion db query <database-id>

# Search
notas notion search <query>

# Output as JSON
notas notion db list --output json
```

### Commands

```
notas notion auth      login, logout, status, refresh
notas notion databases list, get, query, create, update, delete
notas notion pages     get, create, update, archive, restore
notas notion blocks    list, get, append, update, delete
notas notion users     list, get, me
notas notion search    <query>
notas notion comments  list, create
notas notion api       <method> <endpoint> [--body json]
notas notion version
```

`db` is an alias for `databases`.

## Skills

| Skill | Description |
|-------|-------------|
| **notion** | Reference guide for the notas CLI Notion provider — pages, databases, blocks, users, comments, and search |

### Claude Code

```bash
# Add marketplace
/plugin marketplace add circlesac/notas-cli

# Install plugin
/plugin install notas
```

### Pi

```bash
pi install git:circlesac/notas-cli
# or: npx @mariozechner/pi-coding-agent install git:circlesac/notas-cli
```

## Development

```bash
# Run locally
bun run dev -- notion db list

# Lint (oxlint + eslint + prettier + biome + tsc)
bun run lint

# Type check
bun run type-check

# Test
bun run test

# Build native binary
bun run build

# Full pre-merge check
bun run pre-merge
```

## Project Structure

```
src/
  index.ts                  CLI entry point
  lib/                      Shared utilities (credentials, output, errors)
  platforms/notion/          Notion provider
    auth/                   login, logout, status, refresh
    databases/              CRUD + query
    pages/                  CRUD + archive/restore
    blocks/                 CRUD + append
    users/                  list, get, me
    search/                 full-text search
    comments/               list, create
    api.ts                  raw API passthrough
    client.ts               Notion client factory
    properties.ts           property formatting
  types/                    shared types
worker/                     Cloudflare Worker (OAuth callback relay at notas.circles.ac)
npm/                        npm distribution (shim + installer)
homebrew/                   Homebrew formula template
```

## Deploy

```bash
# Deploy OAuth callback worker
bun run deploy:worker
```

## Release

Releases are triggered via `workflow_dispatch` in GitHub Actions. The workflow runs tests, bumps the version (CalVer via `@circlesac/oneup`), builds native binaries for 4 platforms, creates a GitHub Release, publishes to npm, and updates the Homebrew formula.

```bash
gh workflow run release.yml
```
