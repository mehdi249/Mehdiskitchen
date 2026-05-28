# Mehdi's Kitchen — Project Notes

## Supabase REST API Write Operations

When fixing or writing `sbUpdate` (PATCH) and `sbDelete` (DELETE) calls:

1. **Strip `id`, `created_at`, and `source_url` from PATCH/POST bodies** — use `sbStrip(recipe, keepId)`. `source_url` is not a Supabase column; it lives in localStorage only.
2. **Always add `Prefer: return=minimal`** to PATCH and DELETE requests — prevents PostgREST from doing an implicit SELECT on the result, which can fail under RLS even when the write itself is allowed.
3. **Use `encodeURIComponent` on ID values** in URL filters (e.g. `?id=eq.${encodeURIComponent(recipe.id)}`).
4. **Always check return values** of `sbDelete`/`sbUpdate` and show user-facing error feedback on failure — never silently proceed as if the operation succeeded.

## Adding Recipes from Screenshots

When the user shares a recipe screenshot, extract it and add it to the `PENDING_RECIPES` array in `index.html` (just before `init()`), then commit and push to `main`. On next app refresh, `insertPending()` will insert each entry using **`ignore-duplicates`** — this means existing records (including user-edited images and data) are **never overwritten**. Safe to leave permanently.

**Critical:** `insertPending` must always use `resolution=ignore-duplicates`, NOT `merge-duplicates`. Using `merge-duplicates` overwrites user-edited fields (like image URLs) with the empty defaults in `PENDING_RECIPES`.

Do NOT use the URL import approach; it has length/formatting issues on mobile.

**Every recipe added to `PENDING_RECIPES` must include a `grocery` field** — a flat, deduplicated, quantity-free list of ingredient names. Curate it manually from the screenshot at the same time as the recipe. Example:

```js
grocery: ["chicken thighs", "garlic", "lime juice", "honey", "tortillas", "cilantro"]
```

Rules for the grocery list:
- No quantities or units ("garlic" not "3 cloves garlic")
- No prep notes ("garlic" not "garlic, minced")
- No duplicates across sections
- Plain shopping-list names only
- Also add `grocery` to any SEED entries that don't have one

`sbStrip()` removes `grocery` before all Supabase writes (it's not a DB column). `applyGroceryLists()` merges it back from SEED/PENDING_RECIPES into recipes after every `sbFetch()`. User edits to the grocery list in the editor are persisted in localStorage (`recipe_grocery_lists`, key: `{id: [...]}`).

## source_url Field (Recipe Source Links)

`source_url` is a **text column in the Supabase `recipes` table** — it flows through normally like any other field.

- `sbStrip()` does NOT remove it — it is saved to Supabase on every PATCH/POST
- `getSourceUrl(id)` — reads from localStorage (legacy fallback only, for migration)
- `migrateSourceUrls(recipes)` — runs once on init, patches any recipe that has a source URL in localStorage but not yet in Supabase, then clears the need for further migration
- In `buildDetail`, use `recipe.source_url || getSourceUrl(recipe.id)` (localStorage fallback covers any unmigrated recipes)
- In `buildEditorModal`, `if(form.id&&!form.source_url) form.source_url=getSourceUrl(form.id)` pre-populates from localStorage for any recipe not yet migrated

## Protecting User-Edited Recipe Data

User-edited fields (images, source links, schedule, etc.) stored in Supabase must never be overwritten by app updates. Rules:

- `insertPending` → always `ignore-duplicates`
- `sbSeed` → `merge-duplicates` is OK (only runs when DB is empty)
- `sbInsert` from editor → `merge-duplicates` is OK (intentional user action)
- Never add `image: ""` or other empty defaults to `PENDING_RECIPES` expecting them to be benign — they will overwrite real data if `merge-duplicates` is ever used

## Pull-to-Refresh Behaviour

PTR only activates when **both** conditions are true:
1. `window.scrollY === 0` at touchstart
2. The touch starts in the **top 30% of the screen** (`clientY < window.innerHeight * 0.3`)

This prevents upward scroll gestures from the bottom of the page accidentally triggering refresh. A mid-gesture cancel also fires if `scrollY > 0` during touchmove.

PTR is only enabled on `view === "home"` and `view === "recipes"`.

## Dev View Must Stay in Sync

The `buildDevView()` function in `index.html` contains a `NODES` array that documents the app's architecture. **Every time a feature is added, removed, or meaningfully changed, update the relevant node(s) before committing.** Rules:

- Adding a new feature → add a new node entry with `id`, `label`, `sub`, `color`, `col`, `desc`, and `actions`
- Removing a feature → remove its node entirely (don't leave stale entries)
- Changing how something works → update the `desc` of the affected node(s)
- Node columns: 0 = entry, 1 = data/Supabase, 2 = state, 3 = views, 4 = features/tools

## Deployment

- The app is served from the `main` branch
- All feature branches must be merged to `main` before changes are visible in the app
- Always push to `main` after completing a feature or fix
