# Rat King Daily Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three offline daily challenges to Rat King's classic mode, with local completion progress and a persistent daily badge count.

**Architecture:** Keep challenge definitions, deterministic date selection, per-run metrics, and persistence in `js/game.js`. Add a compact task list and result summary to `RatKing.html`, style them in `css/style.css`, and document the feature in `README.md`.

**Tech Stack:** Browser JavaScript, HTML, CSS, `localStorage`.

**Spec:** `docs/superpowers/specs/2026-10-08-rat-king-daily-challenges-design.md`

## Global Constraints

- Im klassischen Modus sind täglich drei Aufgaben aktiv. Der Karnevalsmodus zählt nicht für Tagesaufgaben.
- Die Aufgaben werden für das lokale Kalenderdatum aus einem festen Pool ausgewählt. Die Auswahl ist innerhalb dieses Datums stabil und funktioniert offline.
- Aufgaben dürfen in jeder freigeschalteten Karte und Schwierigkeit erfüllt werden.
- Der Tagesabzeichen-Zähler wird lokal gespeichert und nicht mit Schwer-Punkten oder Figurenkäufen verrechnet.
- Fehlerhafte oder fehlende gespeicherte Challenge-Daten dürfen den Spielstart nicht verhindern.
- Bestehende Schlüssel und Daten für Bestwerte, Sammlungen, Figuren und Schwer-Punkte bleiben unverändert.

## Review Focus

- Local-date rollover while the menu is open; the menu should show the new day's tasks without losing the badge total.
- A round spanning midnight; its results should be evaluated against the tasks active when that round started.
- Malformed or unavailable `localStorage`; the game should start with default challenge progress and remain playable.
- Carnival runs; they must not complete classic daily challenges.
- Repeated completion checks or multiple completion conditions in one round; each task and the daily badge must count at most once.

---

### Task 1: Add daily challenge logic and persistence

**Files:**
- Modify: `js/game.js`

**Interfaces:**
- Produces `getLocalDateKey(date: Date) -> string`, `getChallengesForDay(dayKey: string) -> DailyChallenge[]`, `ensureDailyChallengeDay(dayKey: string) -> boolean`, and `recordDailyChallengeResults(stats: RunStats, dayKey: string) -> { newlyCompleted: string[], badgeAwarded: boolean }`.
- `DailyChallenge` contains `id`, `title`, `description`, and an evaluator over `RunStats`.
- `RunStats` contains `collected`, `sweetCount`, `score`, `usedBoost`, and `ratTunnelsUsed`.

- [x] **Step 1: Define the five fixed challenges and deterministic date selection.** Use local `YYYY-MM-DD` keys; seed FNV-1a from the date string, shuffle with xorshift32 and Fisher-Yates, then select the first three entries.

- [x] **Step 2: Add versioned local challenge state.** Store `{ date, completedIds, totalBadges }` under `ratKingDailyChallengesV1`. On date change, clear only `completedIds`; preserve `totalBadges`. Catch parse and storage errors so challenge state falls back to defaults.

- [x] **Step 3: Track the current classic round's food count, sweet count, score, boost use, and tunnel use.** Reset the counters in `start()`, update them at their existing gameplay events, and capture the local day key at round start.

- [x] **Step 4: Evaluate the run once in `end()` for classic mode.** Complete every newly satisfied active task, save progress, award exactly one badge when all three tasks are complete, and return the newly completed task IDs plus whether the badge was awarded.

### Task 2: Add the challenge panel and result feedback

**Files:**
- Modify: `RatKing.html`
- Modify: `css/style.css`
- Modify: `js/game.js`
- Modify: `README.md`

**Interfaces:**
- Consumes Task 1's `getChallengesForDay()`, `ensureDailyChallengeDay()`, and `recordDailyChallengeResults()` outputs.
- HTML provides `dailyChallengeList`, `dailyChallengeBadgeCount`, and `dailyChallengeResult` elements.
- Produces `renderDailyChallenges() -> void`, which renders the current day's three tasks and badge total.

- [x] **Step 1: Add a compact daily challenge section to the main menu.** Include a heading with the total badge count and a list for the three task statuses.

- [x] **Step 2: Add a result summary element below the existing round result text.** It reports newly completed tasks and the badge award, and remains hidden when the round completes no challenge.

- [x] **Step 3: Style the task list and completed state in `css/style.css`.** Match the existing card colors, borders, spacing, and small-screen scrolling behavior.

- [x] **Step 4: Implement `renderDailyChallenges()` against the HTML IDs from Task 2.** Render titles and descriptions as text, mark saved completions, and display the badge total.

- [x] **Step 5: Render challenges on initial load and refresh the day while the menu is visible, when returning to the menu, and when starting a round.** Do not replace the active task set during a running round; use the captured round-start date when recording its result.

- [x] **Step 6: Connect the end-of-round result to `dailyChallengeResult` and document daily challenges in `README.md`.** Keep existing result text and existing progress systems intact.

- [x] **Step 7: Review the final source tree and the changed markup, styles, and JavaScript for consistency with the spec.** No automated tests are included in this plan.

## Environment Note

The current `.git` directory is read-only and is not a valid Git repository. Do not attempt to commit this spec, plan, or implementation until the project metadata is made writable and Git can be initialized.
