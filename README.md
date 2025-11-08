```
bun install
bun run dev
```

### Quality checks

```
bun run lint       # biome check --reporter summary
bun run lint:fix   # biome check --write (safe fixes) / used by lefthook
bun run lint:staged # biome check --write --staged (manual staged-file run)
bun run format     # biome format --write
```

### Git hooks

Lefthook runs `bun run lint:fix -- {files}` on pre-commit (only when staged files match `**/*.{ts,tsx,js,jsx,cts,mts,cjs,mjs,json,jsonc,md,mdx}`) so fixes are applied before committing, and `bun run lint` on pre-push. Hooks are installed automatically via the `prepare` script, but you can re-install manually with `bunx --bun lefthook install`.
