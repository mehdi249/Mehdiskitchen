# Mehdi's Kitchen — App Dev Log

**App:** PWA recipe app (single `index.html`, no framework)  
**Stack:** Vanilla JS · Supabase (PostgREST) · iOS Safari PWA  
**Repo:** `mehdi249/Mehdiskitchen` · Served from `main` branch  
**Last updated:** 2026-05-28

---

## What the App Does

- Browse and search personal recipe collection
- Filter by cuisine, tag (High Protein, Quick, Meal Prep), type
- Weekly meal planner (schedule recipes to days)
- Pull-to-refresh and header refresh button
- Recipe editor (add/edit/delete)
- Grocery list export → iOS Reminders via Shortcuts
- Source link per recipe (Instagram, TikTok URLs)
- Admin mode toggle

---

## Architecture

| Layer | Detail |
|---|---|
| Data | Supabase Postgres via PostgREST REST API |
| State | Single `S` object, `ss()` merges + re-renders |
| Views | `home`, `recipes`, `detail`, `planner`, `dev` |
| Local storage | `source_url` map, `grocery_lists` map, shortcut name |
| Pending inserts | `PENDING_RECIPES` array, inserted on load with `ignore-duplicates` |
| Seed | `SEED` array, only runs when DB is empty |

### Key Functions

| Function | What it does |
|---|---|
| `sbFetch()` | GET all recipes from Supabase |
| `sbInsert(recipe)` | POST new recipe (`merge-duplicates`) |
| `sbUpdate(recipe)` | PATCH existing recipe |
| `sbDelete(id)` | DELETE recipe by ID |
| `sbStrip(obj, keepId)` | Strips `id`, `created_at`, `source_url`, `grocery` before any write |
| `sbSeed()` | Seeds from SEED array, only when DB is empty |
| `insertPending()` | Inserts PENDING_RECIPES with `ignore-duplicates` — safe to run repeatedly |
| `applyGroceryLists(recipes)` | Merges curated `grocery` arrays from SEED/PENDING_RECIPES back onto fetched recipes |
| `shareIngredients(recipe)` | Copies grocery list to clipboard → launches iOS Shortcut |
| `dedupeIngredients(items)` | Fallback: strips quantities/units from raw ingredients and deduplicates |
| `doRefresh(btnEl)` | Refresh button handler — fetches + applies grocery lists |
| `initPullToRefresh()` | Sets up touch-based PTR with zone guard |

---

## Recipes in the App

| ID | Name | Macros (cal/pro) |
|---|---|---|
| `1` | Peruvian Style Chicken with Coconut Rice & Aji Verde | — |
| `2` | Chipotle Honey Chicken Tacos | 342 cal / 34g protein |
| `chipotle-honey-chicken-tacos` | Chipotle Honey Chicken Tacos (pending ver.) | 342 cal / 34g protein |
| `chipotle-shrimp-tacos-mango-salsa` | Chipotle Shrimp Tacos with Mango Salsa & Avocado Crema | — |
| `protein-sweet-potato-boats` | Protein Loaded Sweet Potato Boats | 580 cal / 54g protein |
| `honey-chipotle-chicken-mac-n-cheese` | Honey Chipotle Chicken Mac n Cheese | 651 cal / 61g protein |
| `garlic-shrimp-sliders` | Garlic Shrimp Sliders | — |
| `korean-popcorn-chicken` | Korean Popcorn Chicken | — |
| `bang-bang-chicken-tenders` | High Protein Bang Bang Chicken Tenders | 598 cal / 93g protein |
| `bang-bang-shrimp-tacos` | High Protein Bang Bang Shrimp Tacos | 378 cal / 35g protein |

---

## Features Added (This Session)

### 1. Source Link per Recipe
- User can paste an Instagram/TikTok URL when editing a recipe
- Stored in **Supabase** as `source_url text` column — shared across all devices
- `sbStrip()` does NOT remove it — flows through normally
- Shows as "View Original Recipe" button in recipe detail view
- `migrateSourceUrls()` runs once on init to patch any URLs previously stored in localStorage into Supabase

### 2. Grocery List Export → iOS Reminders
- "Add to Grocery List" button in each recipe's Ingredients header
- Gear icon opens setup sheet explaining how to build the Shortcut
- **Flow:** copy items to clipboard → launch `shortcuts://run-shortcut?name=NAME&input=clipboard`
- Uses `document.execCommand("copy")` (no iOS permission prompt, works reliably)
- Falls back to `navigator.clipboard.writeText()` if execCommand fails
- User sets up a one-time iOS Shortcut:
  - Split Text (by new line) → Repeat with Each → Add New Reminder to Groceries list
- Shortcut name saved in localStorage key `grocery_shortcut_name`

### 3. Curated Grocery Lists per Recipe
- Each recipe has a hidden `grocery: [...]` field — flat, deduplicated, quantity-free
- Example: `["chicken thighs", "garlic", "lime juice", "honey", "tortillas"]`
- **Never shown in the recipe view** — only visible in the editor modal
- In editor: "Grocery List" textarea (one item per line) at the bottom of the form
- Edits saved to localStorage key `recipe_grocery_lists` → `{ id: [...] }` map
- `sbStrip()` strips `grocery` before all Supabase writes (not a DB column)
- `applyGroceryLists()` merges it back after every `sbFetch()` call
- `shareIngredients()` uses `recipe.grocery` if present; falls back to `dedupeIngredients()` algorithm for older recipes

### 4. Pull-to-Refresh Zone Guard
- PTR requires **both**: `scrollY === 0` AND touch starts in **top 30%** of screen
- Prevents upward scroll from bottom of page accidentally triggering refresh
- Mid-gesture cancel fires if `scrollY > 0` during touchmove
- Only enabled on `view === "home"` and `view === "recipes"`

---

## Bugs Fixed (This Session)

### Recipes not showing after push
- **Cause:** Changes were on feature branch, not `main`
- **Fix:** Always push to `main` — that's what the app serves from

### "Failed to save. Check connection." on recipe save
- **Cause:** `source_url` field included in Supabase PATCH body, but column doesn't exist in DB
- **Fix:** Added `sbStrip()` that removes `source_url` (and later `grocery`) before all writes

### Images disappearing after update
- **Cause:** `insertPending()` used `merge-duplicates` which overwrote user-edited image URLs with `image: ""` from PENDING_RECIPES on every page load
- **Fix:** Switched `insertPending` to `resolution=ignore-duplicates` — existing records are never touched

### Pull-to-refresh triggering from bottom of page
- **Cause:** On short pages, `scrollY` is 0 even when the user is at the bottom
- **Fix:** Added zone guard — touch must start in top 30% of screen height

### Grocery button needed two taps
- **Cause:** `navigator.clipboard.writeText()` triggers iOS permission prompt on first use, blocking the shortcut launch
- **Fix:** Use `document.execCommand("copy")` first (no prompt); fall back to clipboard API only if that fails

### Duplicate ingredients in grocery export
- **Cause:** Same ingredient listed in multiple recipe sections (e.g., garlic in marinade AND sauce)
- **Fix:** Added `dedupeIngredients()` which normalises core ingredient name and deduplicates

### Blank screen after code change
- **Cause:** Extra `}` closing brace introduced inside `shareIngredients()` caused JS parse error
- **Fix:** Removed stray brace. Now validate with `node -e "new Function(...)"` before every commit

### Grocery list still showing quantities after fix
- **Root cause 1:** `grocery` field stripped by `sbStrip()` before Supabase insert → recipes loaded from DB had no `grocery` field → fell back to `dedupeIngredients()` which kept quantities
- **Fix 1:** Added `applyGroceryLists()` that merges curated lists back in by recipe ID after every fetch
- **Root cause 2:** `doRefresh()`, pull-to-refresh handler, `confirmDelete()`, and `checkUrlImport()` all called `sbFetch()` and set `S.recipes` directly — wiping out the grocery fields applied at startup
- **Fix 2:** Wrapped every `sbFetch()` result with `applyGroceryLists()` before it enters state

---

## Critical Rules (Don't Break These)

### Supabase Writes
- Always strip `id`, `created_at`, `source_url`, `grocery` from PATCH/POST bodies using `sbStrip()`
- Always add `Prefer: return=minimal` to PATCH and DELETE — prevents implicit SELECT that can fail under RLS
- Use `encodeURIComponent(id)` in URL filters
- Always check return values and show user-facing errors on failure

### PENDING_RECIPES
- **ALWAYS** use `resolution=ignore-duplicates` — NEVER `merge-duplicates`
- `merge-duplicates` will overwrite user-edited images and data with empty defaults
- Every entry must have a `grocery: [...]` field (see below)
- Safe to leave PENDING_RECIPES permanently — idempotent

### Grocery Field Rules
Every recipe added to PENDING_RECIPES (and SEED) must include:
```js
grocery: ["ingredient name", "ingredient name", ...]
```
Rules:
- No quantities or units (`"garlic"` not `"3 cloves garlic"`)
- No prep notes (`"garlic"` not `"garlic, minced"`)
- No duplicates across sections
- Plain shopping-list names only

### After Every sbFetch
Every place that calls `sbFetch()` and updates `S.recipes` must also call `applyGroceryLists()`:
```js
var fresh = await sbFetch();
if (fresh) ss({ recipes: applyGroceryLists(fresh) });
```
Locations: `doRefresh()`, pull-to-refresh handler, `confirmDelete()`, `checkUrlImport()`, `init()`, editor save handler.

### Local-Only Fields
These fields are NOT Supabase columns — they live in localStorage only:

| Field | localStorage key | Format |
|---|---|---|
| `source_url` | `recipe_source_urls` | `{ id: url }` |
| `grocery` | `recipe_grocery_lists` | `{ id: [...] }` |
| Shortcut name | `grocery_shortcut_name` | string |

### Deployment
- App served from `main` branch — push there for changes to be live
- Feature branches are invisible to the app until merged to `main`

### Dev View
`buildDevView()` has a `NODES` array documenting the architecture. Update it whenever a feature is added, removed, or changed.

---

## iOS Shortcut Setup (Grocery → Reminders)

For reference — the Shortcut the user has set up:

1. **Receive** Shortcut Input (text from clipboard)
2. **Split Text** — split by New Lines
3. **Repeat with Each Item** — using the Split Text result
4. **Add New Reminder** — Title = Repeat Item, List = Groceries
5. Shortcut named: (user's custom name, stored in app settings)

---

## Code Patterns to Copy

### sbStrip
```js
function sbStrip(obj, keepId) {
  var b = Object.assign({}, obj);
  if (!keepId) delete b.id;
  delete b.created_at;
  delete b.source_url;
  delete b.grocery;
  return b;
}
```

### applyGroceryLists
```js
function applyGroceryLists(recipes) {
  var coded = {};
  SEED.forEach(function(r) { if (r.grocery) coded[r.id] = r.grocery; });
  PENDING_RECIPES.forEach(function(r) { if (r.grocery) coded[r.id] = r.grocery; });
  return recipes.map(function(r) {
    var gl = getGroceryList(r.id) || coded[r.id] || null;
    return gl ? Object.assign({}, r, { grocery: gl }) : r;
  });
}
```

### shareIngredients (core logic)
```js
function shareIngredients(recipe) {
  var items;
  if (recipe.grocery && recipe.grocery.length) {
    items = recipe.grocery.slice(); // use curated list
  } else {
    items = [];
    Object.entries(recipe.ingredients).forEach(function(entry) {
      entry[1].forEach(function(item) { items.push(item); });
    });
    items = dedupeIngredients(items); // fallback
  }
  // copy to clipboard → launch iOS Shortcut
}
```

### PENDING_RECIPES entry template
```js
{
  id: "recipe-id-slug",
  name: "Recipe Name",
  cuisine: "American",
  tags: ["High Protein", "Quick"],
  type: "Main Course",
  schedule: [],
  image: "",
  ingredients: {
    "Section Name": ["ingredient with quantity", ...],
  },
  steps: ["Step one.", "Step two."],
  macros: { calories: 400, protein: 40, carbs: 30, fat: 12 },
  grocery: ["ingredient", "ingredient", ...]  // ← REQUIRED, no quantities
}
```
