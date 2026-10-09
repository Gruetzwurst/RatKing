# Rat King Structure and Git Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current Rat King v0.10.12 into HTML, CSS, and JavaScript files, preserve all historical snapshots, and set up Git version control.

**Architecture:** `index.html` remains the launch page, with styles in `css/style.css` and game logic in `js/game.js`. Move all seven versioned single-file snapshots unchanged to `archive/`; retain docs and add concise project setup guidance.

**Tech Stack:** HTML, CSS, browser JavaScript, Git.

**Spec:** `docs/superpowers/specs/2026-10-08-rat-king-structure-and-git-design.md`

## Global Constraints

- Current game content comes from v0.10.12.
- The seven previous version files are preserved unchanged in `archive/`.
- Existing files under `docs/` remain present.
- Do not change global Git configuration or invent a commit identity.

## Review Focus

- Relative CSS/JS URLs resolve when `index.html` is opened directly from disk; check both paths exist and are referenced with the correct relative names.
- Extracting inline script/style content preserves ordering and any inline event handlers; compare source contents and launch the game once.
- The archived snapshots retain their original bytes; compare their checksums before and after moving.
- Git initialization must stop cleanly if `.git` remains read-only; report the exact environmental blocker and do not alter permissions outside the authorized writable area.
- Git must not ignore project files; review `git status --short` against the intended source tree.

---

### Task 1: Split and organize the current game

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/game.js`
- Move unchanged: all `rat_king_v0_10_*.html` files to `archive/`
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- `index.html` references `css/style.css` and `js/game.js` via relative paths.
- `js/game.js` remains a classic script loaded at the end of the document, preserving its current global DOM and event-handler behavior.

- [ ] **Step 1: Record checksums of the seven snapshots, then move them unchanged into `archive/`.**

Run: `sha256sum rat_king_v0_10_*.html`
Expected: seven hashes recorded for comparison after the moves.

- [ ] **Step 2: Create `index.html` from v0.10.12, replacing the inline style and script blocks with the specified external references.** Keep the rest of the markup and document order unchanged.

- [ ] **Step 3: Extract the exact style block to `css/style.css` and the exact script block to `js/game.js`.** Do not reformat or refactor game logic during extraction.

- [ ] **Step 4: Add `README.md` with the project description, file map, and instruction to open `index.html` in a browser. Add `.gitignore` for common OS/editor metadata only.**

- [ ] **Step 5: Compare the archived file checksums with Step 1 and inspect HTML references.**

Run: `sha256sum archive/rat_king_v0_10_*.html`
Expected: each archive hash equals its recorded source hash. Confirm both linked files exist and there are no remaining inline `<style>` or game `<script>` blocks in `index.html`.

- [ ] **Step 6: Review the resulting source tree and references without adding a test suite.** Confirm the document links point to existing files, the latest game logic is present, and the old snapshots match their checksums.

### Task 2: Initialize Git and capture the organized project

**Files:**
- Git metadata: `.git/`
- Track: project source, archive, docs, README, and `.gitignore`

**Interfaces:**
- Requires Task 1 complete.
- Produces a Git repository at the project root with an initial commit, if the environment permits writing `.git` and a Git identity is already configured.

- [ ] **Step 1: Check `.git` writability and configured commit identity without changing global settings.**

Run: `git status --short --branch` and `git config user.name` / `git config user.email`.
Expected: valid repository metadata and a usable identity, or a clear blocker. The current environment reports `.git` as read-only, so initialization may require the workspace metadata permissions to be corrected first.

- [ ] **Step 2: Initialize Git in the project root if it is not already a repository.**

Run: `git init`
Expected: Git creates repository metadata at the project root.

- [ ] **Step 3: Review the complete status, stage the organized project, and create the initial commit.**

Run: `git status --short`, `git add .`, `git status --short`, then `git commit -m "Organize Rat King project and initialize Git"`.
Expected: the commit contains the split game, archive, docs, README, and `.gitignore`; no project files are omitted.

- [ ] **Step 4: Confirm the initial commit and clean working tree.**

Run: `git log -1 --oneline` and `git status --short --branch`.
Expected: the initial commit is shown and no tracked changes remain.
