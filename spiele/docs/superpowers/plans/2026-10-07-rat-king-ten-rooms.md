# Rat King: Ten Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Rat King from five to ten playable house-and-garden maps while preserving the current round rules and saved progress.

**Architecture:** Keep the existing self-contained HTML build so it remains easy to open and test in the current environment. Replace scattered map-specific branches with a central map registry for labels, layouts, and simple floor/obstacle colors; append five map definitions and derive selection and progression defaults from the registry.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Canvas 2D, localStorage. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-07-rat-king-maps-design.md`

## Global Constraints

- Preserve the existing 60-second rounds, 20-item goal, cat behavior, 42-unit catch radius, power-ups, controls, and difficulty rules.
- Keep the dash cloud cosmetic; it must not influence cat behavior.
- Preserve the existing IDs and order for living, kitchen, hallway, storage, and bathroom.
- Append bedroom, dining, attic, cellar, and garden in that order.
- Keep existing local best scores and unlocks; new maps begin locked and unlock at 50 points on Normal in the previous map.
- Keep the HTML build directly playable in the current environment; defer app packaging, art polish, and Schwer-Siege.
- Do not add dependencies or a test framework.
- The working folder is not a Git repository; do not initialize one or rely on commit steps.

## Review Focus

- **Legacy save missing the five new map IDs:** defaults include the new maps without resetting old unlocks or high scores; verify with the existing five-map localStorage shape.
- **Small viewport with ten map buttons:** every map remains reachable by scrolling the selection panel.
- **Dense obstacle layout:** rat and cat starts, collectible placement, and four rat holes have viable clear areas.
- **Last map progression:** earning 50 points on Normal in the garden unlocks its Hard difficulty without creating an eleventh map.
- **Randomized round content:** normal food remains collectible and special objects retain their existing score and counter behavior.

---

### Task 1: Centralize existing map definitions

**Files:**
- Create: `rat_king_v09_0.html` as a copy of `rat_king_v08_0.html`; keep v0.8.0 unchanged.
- Modify: `rat_king_v09_0.html`

**Interfaces:**
- Produces `MAPS`, keyed by the stable map IDs, with `label`, `makeObstacles({worldW, worldH})`, and simple `floor` and `obstacle` palette values.
- Each `floor` value has `{background, surface, line, border, pattern, spacing, lineWidth?, borderWidth?}`; `pattern` is one of `grid`, `vertical`, `horizontal`, or `plain`. Each `obstacle` value has `{outer, inner, label}` color strings.
- Each `makeObstacles` returns an array of `{x, y, w, h, label}` objects.
- Produces `MAP_ORDER`, derived from the registry's insertion order.
- Existing callers continue to use `currentMap`, `obstacles`, `buildRoom()`, `drawMap()`, `renderMapButtons()`, and the current save keys.

- [ ] **Step 1: Define a registry for the existing five maps**

Add `MAPS` entries in the current order: `living`, `kitchen`, `hallway`, `storage`, `bathroom`. Move each room's current label, obstacle geometry, and simple floor/obstacle colors into its entry. Preserve the current geometry and text labels.

- [ ] **Step 2: Route room construction and drawing through the registry**

Update `buildRoom()` to set `obstacles` from `MAPS[currentMap].makeObstacles({worldW, worldH})`. Update map and obstacle rendering to use the registered palette. Generate map labels from `MAPS` in `renderMapButtons()`; keep current icons and wording.

- [ ] **Step 3: Derive default unlock data from the registry**

Build fallback `maps` and `hard` objects from `MAP_ORDER`, with only `living` initially unlocked. Merge saved `maps` and `hard` values over those defaults as today. Keep the `ratKingHighscore_<mapId>` key format unchanged.

- [ ] **Step 4: Open the HTML build and verify the existing five maps**

Run: open `rat_king_v09_0.html` in the available browser.
Expected: all five existing maps render and play with their current layouts; a saved five-map unlock object loads without losing its values.

### Task 2: Add the five house-and-garden maps

**Files:**
- Modify: `rat_king_v09_0.html`

**Interfaces:**
- Consumes the `MAPS` entry shape from Task 1.
- Produces five new entries: `bedroom`, `dining`, `attic`, `cellar`, `garden`.

- [ ] **Step 1: Add map labels and thematic obstacle layouts**

Append entries in this order: Schlafzimmer (`bedroom`), Esszimmer (`dining`), Dachboden (`attic`), Keller (`cellar`), Garten (`garden`). Use the approved landmarks: bed/wardrobe/nightstands; dining table/chairs/sideboard; boxes/trunk; shelves/boxes/washer; flowerbeds/garden furniture/shed. Reuse the existing rectangular obstacle collision model and simple rendering style.

- [ ] **Step 2: Fit each layout to the existing world dimensions**

Use `worldW` and `worldH` in each `makeObstacles` function where layout positions depend on room size. Leave clear paths through the room and open space for starts, food, and rat holes. Do not add map-specific hazards or mechanics.

- [ ] **Step 3: Open each new map and verify generated play space**

Run: open `rat_king_v09_0.html` in a temporary browser profile with the new map IDs enabled in test `ratKingUnlocks` data, then select each new map.
Expected: each map has its own recognizable obstacle arrangement; a round starts without rat/cat overlap or blocked spawns, and four rat holes can be generated in clear areas.

### Task 3: Make ten-map selection and progression usable on mobile-sized screens

**Files:**
- Modify: `rat_king_v09_0.html`

**Interfaces:**
- Consumes `MAPS` and `MAP_ORDER` from Task 1 and all ten entries from Task 2.
- Preserves `loadUnlocks()`, `saveUnlocks()`, `unlockProgress()`, `renderMapButtons()`, and existing localStorage keys.

- [ ] **Step 1: Confirm sequential unlocks across all ten maps**

Use the registry order for next-map unlock logic. At 50 points on Normal, unlock Hard for the current map and the next map when one exists. The garden unlocks Hard but does not append or unlock another map.

- [ ] **Step 2: Make the map picker scroll within the menu card**

Adjust the menu/card and `.maps` CSS so ten map buttons fit through vertical scrolling on short/narrow viewports. Keep safe-area padding and ensure the Start button and difficulty choices remain reachable.

- [ ] **Step 3: Check persistence and mobile-sized menu access**

Run: open the game in a temporary browser profile, seed a legacy five-map `ratKingUnlocks` object, inspect a narrow and short viewport, then exercise `unlockProgress()` with `difficulty='normal'` and `score=50` for each map in order.
Expected: all ten map rows can be reached; existing map unlocks/high scores remain intact; the next map unlocks in order; garden does not unlock an eleventh map.

### Task 4: End-to-end browser playthrough

**Files:**
- Modify: `rat_king_v09_0.html` only if a defect is found.

- [ ] **Step 1: Verify shared gameplay behavior on representative rooms**

Run: play a round on one original interior map, one new interior map, and the garden using touch controls where available and keyboard controls in the desktop browser.
Expected: the timer, score, 20-item goal, cat, power-ups, pause/menu flow, and end-of-round results behave as before.

- [ ] **Step 2: Verify all ten map selections and screen sizes**

Run: inspect the menu at a small mobile-sized viewport and a desktop-sized viewport; select and start each map.
Expected: all ten labels are visible via scrolling, the selected map is clear, and each selected map starts its own room layout.

- [ ] **Step 3: Recheck legacy save behavior**

Run: open a browser profile containing the old five-map `ratKingUnlocks` shape and existing `ratKingHighscore_<mapId>` entries.
Expected: old values remain unchanged; new map keys default to locked and can be unlocked sequentially.
