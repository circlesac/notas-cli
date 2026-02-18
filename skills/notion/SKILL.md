---
name: notion
description: Reference guide for the notas CLI Notion provider. Use this when working with Notion pages, databases, blocks, users, comments, or search.
---

# notas CLI Reference

## Quick Start

```bash
notas notion auth login          # OAuth login (opens browser)
notas notion search "meeting"    # Search across workspace
notas notion db list             # List all databases
```

## Global Flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--workspace` | `-w` | Select workspace (when multiple configured) |
| `--json` | | Output as JSON |
| `--plain` | | Output as tab-separated plain text |

## Authentication

```bash
notas notion auth login                        # OAuth flow (default)
notas notion auth login --token ntn_xxx        # Manual token
notas notion auth login --name work            # Name the workspace
notas notion auth status                       # Show all workspaces
notas notion auth logout --name work           # Remove a workspace
notas notion auth refresh                      # Refresh OAuth token
notas notion auth rename old-name new-name     # Rename workspace
```

Environment variable: `NOTION_TOKEN` overrides stored credentials.

## Databases

```bash
notas notion db list
notas notion db get <database-id>
notas notion db query <database-id>
notas notion db query <database-id> --filter '{"property":"Status","select":{"equals":"Done"}}'
notas notion db query <database-id> --sort '[{"property":"Created","direction":"descending"}]'
notas notion db query <database-id> --columns "Name,Status,Date"
notas notion db create <parent-page-id> --title "My Database"
notas notion db update <database-id> --title "New Title" --description "Updated"
notas notion db delete <database-id>
```

Pagination: `--limit 10`, `--all`, `--cursor <cursor>`

## Pages

```bash
notas notion pages get <page-id>
notas notion pages create <parent-id> --title "New Page"
notas notion pages create <parent-id> --title "Page" --content "Body text"
notas notion pages create <parent-id> --title "Page" --icon "📝"
notas notion pages create <db-id> --parent-type database --title "Row" --properties '{"Status":{"select":{"name":"Draft"}}}'
notas notion pages update <page-id> --title "Updated Title"
notas notion pages archive <page-id>
notas notion pages restore <page-id>
```

Stdin support:
```bash
cat notes.md | notas notion pages create <parent-id> --title "From File" --stdio
```

## Blocks

```bash
notas notion blocks list <page-id>
notas notion blocks list <page-id> --recursive    # All nested blocks
notas notion blocks get <block-id>
notas notion blocks append <page-id> --text "Hello world"
notas notion blocks append <page-id> --type heading_1 --text "Title"
notas notion blocks append <page-id> --type code --text "console.log('hi')" --language javascript
notas notion blocks append <page-id> --type to_do --text "Task" --checked
notas notion blocks append <page-id> --type bookmark --url "https://example.com"
notas notion blocks append <page-id> --type divider
notas notion blocks append <page-id> --blocks '[{"object":"block","type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"Complex block"}}]}}]'
notas notion blocks update <block-id> --text "Updated text"
notas notion blocks update <block-id> --body '{"paragraph":{"rich_text":[{"type":"text","text":{"content":"Raw update"}}]}}'
notas notion blocks delete <block-id>
```

Block types: `paragraph`, `heading_1`, `heading_2`, `heading_3`, `bulleted_list_item`, `numbered_list_item`, `to_do`, `toggle`, `code`, `quote`, `callout`, `divider`, `bookmark`

Stdin support:
```bash
cat code.py | notas notion blocks append <page-id> --type code --language python --stdio
```

## Search

```bash
notas notion search "query"
notas notion search "query" --type page
notas notion search "query" --type database
notas notion search --sort ascending
notas notion search                              # List all (no query)
```

## Users

```bash
notas notion users list
notas notion users list --filter "john"
notas notion users get <user-id>
notas notion users me
```

## Comments

```bash
notas notion comments list <page-id>
notas notion comments create --page-id <page-id> --text "New comment"
notas notion comments create --discussion-id <id> --text "Reply"
echo "Comment from pipe" | notas notion comments create --page-id <id> --stdio
```

## Raw API

```bash
notas notion api GET /v1/users
notas notion api POST /v1/search --body '{"query":"test"}'
notas notion api POST /v1/databases/<id>/query '{"page_size":5}'
notas notion api PATCH /v1/pages/<id> --body '{"archived":true}'
```

## Common Workflows

### Create a page with content from a file
```bash
cat document.md | notas notion pages create <parent-id> --title "My Doc" --stdio
```

### Query a database and pipe to jq
```bash
notas notion db query <db-id> --json | jq '.results[].properties.Name.title[0].plain_text'
```

### Append multiple blocks from a script
```bash
notas notion blocks append <page-id> --type heading_1 --text "Section Title"
notas notion blocks append <page-id> --text "Paragraph content"
cat snippet.py | notas notion blocks append <page-id> --type code --language python --stdio
```

### Search and get page content
```bash
PAGE_ID=$(notas notion search "meeting notes" --json | jq -r '.results[0].id')
notas notion blocks list $PAGE_ID --recursive --plain
```
