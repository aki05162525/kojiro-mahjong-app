```
bun install
bun run dev
```

### Quality checks

```
bun run lint       # biome check --reporter summary
bun run lint:fix   # biome check --write (safe fixes)
bun run lint:staged # biome check --write --staged (used by lefthook)
bun run format     # biome format --write
```

### Git hooks

Lefthook runs `bun run lint:staged` on pre-commit and `bun run lint` on pre-push. Hooks are installed automatically via the `prepare` script, but you can re-install manually with `bunx --bun lefthook install`.
