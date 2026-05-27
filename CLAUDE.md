# Mehdi's Kitchen — Project Notes

## Supabase REST API Write Operations

When fixing or writing `sbUpdate` (PATCH) and `sbDelete` (DELETE) calls:

1. **Strip `id` and `created_at` from PATCH body** — send only the fields being updated, never the primary key or server-generated columns.
2. **Always add `Prefer: return=minimal`** to PATCH and DELETE requests — prevents PostgREST from doing an implicit SELECT on the result, which can fail under RLS even when the write itself is allowed.
3. **Use `encodeURIComponent` on ID values** in URL filters (e.g. `?id=eq.${encodeURIComponent(recipe.id)}`).
4. **Always check return values** of `sbDelete`/`sbUpdate` and show user-facing error feedback on failure — never silently proceed as if the operation succeeded.

## Dev View Must Stay in Sync

The `buildDevView()` function in `index.html` contains a `NODES` array that documents the app's architecture. **Every time a feature is added, removed, or meaningfully changed, update the relevant node(s) before committing.** Rules:

- Adding a new feature → add a new node entry with `id`, `label`, `sub`, `color`, `col`, `desc`, and `actions`
- Removing a feature → remove its node entirely (don't leave stale entries)
- Changing how something works → update the `desc` of the affected node(s)
- Node columns: 0 = entry, 1 = data/Supabase, 2 = state, 3 = views, 4 = features/tools
