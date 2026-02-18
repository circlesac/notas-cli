---
name: release
description: Trigger a new release of notas CLI via GitHub Actions
disable-model-invocation: true
---

Trigger the release workflow:

```bash
gh workflow run release.yml
```

Then confirm it started:

```bash
gh run list --workflow=release.yml --limit 1
```

The release workflow will:
1. Bump CalVer version via `@circlesac/oneup`
2. Run tests
3. Build binaries (darwin/linux, x64/arm64)
4. Create a GitHub release with tarballs
5. Publish to npm
6. Update the Homebrew tap
7. Push the version tag
