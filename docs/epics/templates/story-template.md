<!--
File: docs/epics/templates/story-template.md
Purpose: Canonical reusable user story template for the Crashlytics Epic Catalog.

USAGE
-----
This file is NOT a standalone story. It is a COPYABLE BLOCK that authors paste
into the `## User Stories` section of any epic file. Stories live INSIDE their
parent epic file (not in separate files) so that each epic is self-contained and
cross-file references cannot break during refactors. Every embedded user story
across all 20 epic files in this catalog — the 10 pipeline epics under
`docs/epics/pipeline/` and the 10 migration epics under
`docs/epics/migration/` — MUST follow the exact structure below. Every
angle-bracketed `<PLACEHOLDER>` token must be replaced with concrete content;
no placeholder may remain unfilled in an authored story.

NARRATIVE FORMAT
----------------
The narrative MUST be: `As a <role>, I want <capability>, so that <outcome>.`
This is the ONLY allowed narrative shape (Rule AR-3). Do not substitute
"In order to ...", "Given that ...", or any other framing.

ACCEPTANCE CRITERIA FORMAT
--------------------------
Acceptance criteria MUST be in Given-When-Then form (Rule AR-4). Each story
carries 2–5 acceptance criteria, each phrased as
`Given <precondition>, When <event>, Then <observable outcome>.`
No other AC form is permitted — no "should ...", no "must ...", no
"verify that ...", no checklists.

AUTHORING RULES ENFORCED BY THIS TEMPLATE
-----------------------------------------
- Rule AR-2 (Stable Identifiers): `<STORY-ID>` MUST follow the pattern
  `STORY-PA-NN-SMM` (for pipeline stories) or `STORY-MIG-NN-SMM` (for migration
  stories), where `NN` matches the parent epic's two-digit ordinal and `MM` is
  a zero-padded two-digit story ordinal within that epic (for example,
  `STORY-PA-01-S03` is the third story inside `EPIC-PA-01`). IDs are stable,
  unique across the entire catalog, and must never be reused or renumbered
  once assigned.
- Rule AR-3 (INVEST-Aligned Stories): The narrative MUST use the
  `As a / I want / so that` framing. Roles cover at minimum: mobile end-user,
  mobile developer, release manager, on-call engineer, data analyst,
  security/privacy reviewer, and migration program lead. Stories aim to be
  Independent, Negotiable, Valuable, Estimable, Small, and Testable.
- Rule AR-4 (Given-When-Then Acceptance Criteria): Every story carries 2–5
  acceptance criteria expressed strictly in Given-When-Then form.
- Rule AR-7 (Dashed Lists Only): All unordered lists use `-` markers;
  numbered bullets are not used anywhere in the catalog.

WHAT TO COPY
------------
When authoring an actual story, copy everything below this comment block —
starting at the `### <STORY-ID>: ...` line and ending at the last
`#### Notes` bullet — into the `## User Stories` section of an epic file.
Replace every angle-bracketed placeholder with concrete content. Remove the
italicized count-range note (it is editorial guidance, not story content).
Omit the `#### Notes` subsection entirely if the story has no notes worth
recording.
-->

### <STORY-ID>: <Short, descriptive story title>

**As a** <role>, **I want** <capability>, **so that** <outcome>.

#### Acceptance Criteria

- **Given** <precondition>, **When** <event>, **Then** <observable outcome>.
- **Given** <precondition>, **When** <event>, **Then** <observable outcome>.
- **Given** <precondition>, **When** <event>, **Then** <observable outcome>.

*<Each story carries 2-5 acceptance criteria. Add or remove bullets to fit within that range.>*

#### Notes

This subsection is OPTIONAL. Include it only when a caveat, platform-specific guidance, or design consideration adds material value. If a story has no notes, this subsection may be omitted entirely.

- <Optional caveat or platform-specific guidance - e.g., "Android-only: requires API level 30+ for ANR reporting via getHistoricalProcessExitReasons.">
- <Optional design consideration - e.g., "Forward-compatible with the future AI-powered grouping experiment.">
