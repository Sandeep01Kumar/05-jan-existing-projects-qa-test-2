<!--
File: docs/epics/templates/epic-template.md
Purpose: Canonical reusable epic template for the Crashlytics Epic Catalog.

USAGE
-----
This template is the structural contract for all 20 epic files in the
Crashlytics Epic Catalog (10 pipeline epics under `docs/epics/pipeline/` named
`EPIC-PA-NN-<slug>.md` and 10 migration epics under `docs/epics/migration/`
named `EPIC-MIG-NN-<slug>.md`). To author a new epic, copy this template
verbatim into the appropriate destination and replace every angle-bracketed
`<PLACEHOLDER>` token with concrete content. The section ordering below is
FIXED — sections must not be reordered, renamed, removed, or added. Embedded
story blocks within the `## User Stories` section must be derived from
`story-template.md` in this same folder.

AUTHORING RULES ENFORCED BY THIS TEMPLATE
-----------------------------------------
- Rule AR-1 (Template Discipline): Section ordering below is fixed and must not be reordered or renamed.
- Rule AR-2 (Stable Identifiers): `<EPIC-ID>` and all embedded `<STORY-ID>`s must be unique across the catalog and never renumbered once assigned.
- Rule AR-3 (INVEST-Aligned Stories): Every embedded story uses the `As a / I want / so that` framing; see `story-template.md`.
- Rule AR-4 (Given-When-Then Acceptance Criteria): Every story has 2-5 acceptance criteria; every epic has 3-6 epic-level acceptance criteria; all in Given-When-Then form.
- Rule AR-5 (Source Grounding): The References section must cite public Firebase or Crashlytics guidance; inferred content must be flagged `[inferred — no direct source]`.
- Rule AR-6 (No Time-Based Planning): Epics describe WHAT and HOW, never WHEN. No sprint numbers, no calendar dates, no week-by-week schedules.
- Rule AR-7 (Dashed Lists Only): All unordered lists use `-` markers; no numbered bullets anywhere.

WHAT TO COPY
------------
When authoring an actual epic file, copy everything below this comment block —
starting at the `# <EPIC-ID>: ...` heading and ending at the last `## References`
bullet — into a new file in either `docs/epics/pipeline/` or
`docs/epics/migration/`. Replace every angle-bracketed placeholder with
concrete content. Do not delete any of the ten H2 sections; if a section
genuinely has no content for a specific epic, replace the placeholders with a
single bullet stating `none` and a one-line justification so that downstream
readers and tooling can rely on the uniform structure.
-->

# <EPIC-ID>: <Short, descriptive epic title>

## Metadata

| Field | Value |
|-------|-------|
| Epic ID | `<EPIC-ID>` |
| Theme | `<Pipeline \| Migration>` |
| Status | `<Proposed \| In Progress \| Done>` |
| Owner | `<Owner placeholder>` |
| Related Epics | `<comma-separated EPIC-IDs, or "none">` |
| Last Updated | `<YYYY-MM-DD or "n/a">` |

## Description

<Two to five sentences explaining what this epic accomplishes. Anchor the description in concrete Firebase Crashlytics behavior. Identify the architectural concern or migration phase this epic owns. Avoid overlapping with sibling epics in the same theme.>

## Business Value

<Two to five sentences explaining why this epic matters. Identify the user roles that benefit (e.g., mobile end-users, mobile developers, on-call engineers, release managers, data analysts, security/privacy reviewers, migration program lead). Quantify the value where possible (e.g., "captures ~30% more Android crashes than the legacy SDK" — cite the source).>

## In Scope

The following items are included in this epic:

- <Concrete scope item 1 with specific Firebase Crashlytics concept or migration artifact>.
- <Concrete scope item 2>.
- <Concrete scope item 3>.

## Out of Scope

The following items are explicitly excluded from this epic and are typically owned by a sibling or successor epic:

- <Concrete excluded item 1, with a reference to the epic that owns it if applicable>.
- <Concrete excluded item 2>.

## User Stories

This epic contains <3-7> user stories. Each story is derived from `../templates/story-template.md` and embedded inline below using H3 headings. Per the catalog's authoring convention (Rule AR-1), stories live INSIDE their parent epic file rather than as separate files, which keeps each epic self-contained and eliminates broken cross-file links during refactors.

### <STORY-ID>: <Short, descriptive story title>

**As a** <role>, **I want** <capability>, **so that** <outcome>.

#### Acceptance Criteria

- **Given** <precondition>, **When** <event>, **Then** <observable outcome>.
- **Given** <precondition>, **When** <event>, **Then** <observable outcome>.
- **Given** <precondition>, **When** <event>, **Then** <observable outcome>.

#### Notes

- <Optional caveat, platform-specific guidance, or design consideration>.

---

### <STORY-ID>: <Short, descriptive story title>

**As a** <role>, **I want** <capability>, **so that** <outcome>.

#### Acceptance Criteria

- **Given** <precondition>, **When** <event>, **Then** <observable outcome>.
- **Given** <precondition>, **When** <event>, **Then** <observable outcome>.

#### Notes

- <Optional caveat — omit this entire H4 subsection if the story has no notes worth recording>.

*<Add additional stories as needed, following the same structure. Each epic should contain 3-7 stories.>*

## Acceptance Criteria (Epic-Level)

The following Given-When-Then criteria summarize exit conditions across all stories in this epic. Per Rule AR-4, every epic carries 3-6 epic-level acceptance criteria. These satisfy the user's R-2 directive ("epics with acceptance criteria") and are applied symmetrically to the pipeline theme for catalog uniformity.

- **Given** <epic-level precondition>, **When** <event>, **Then** <observable outcome>.
- **Given** <epic-level precondition>, **When** <event>, **Then** <observable outcome>.
- **Given** <epic-level precondition>, **When** <event>, **Then** <observable outcome>.

## Definition of Done

The epic is considered complete when ALL of the following observable conditions are simultaneously true:

- <Concrete, observable item 1 — e.g., "A force-crash from a release build of the Android app is visible in the Firebase Console within 5 minutes of cold relaunch.">
- <Concrete, observable item 2 — e.g., "All embedded stories in this epic have their acceptance criteria satisfied.">
- <Concrete, observable item 3 — e.g., "Symbolicated stack traces show original class, file, and line names rather than obfuscated tokens.">
- <Concrete, observable item 4 — e.g., "No regression of the crash-free-users metric vs. the prior baseline.">
- <Concrete, observable item 5>.

## Dependencies

This epic has the following predecessor and successor relationships within the catalog. The dependency graph must remain acyclic.

| Dependency Type | Epic | Justification |
|-----------------|------|---------------|
| `Predecessor` | `<EPIC-ID>` | <Brief 1-sentence justification of why this epic must complete first>. |
| `Predecessor` | `<EPIC-ID>` | <Brief justification>. |
| `Successor` | `<EPIC-ID>` | <Brief justification of why this epic enables the next>. |
| `Successor` | `<EPIC-ID>` | <Brief justification>. |

If this epic has no predecessors or no successors, replace the corresponding rows with a single row whose Epic value is `none` and whose justification is `<reason>`. Do not delete the table entirely; downstream tooling expects a dependency table in every epic.

## References

Per Rule AR-5 (Source Grounding), this epic's content must be grounded in public Firebase or Crashlytics guidance. The following references support the claims made above. Inferred content not directly traceable to a public source must be explicitly flagged inline as `[inferred — no direct source]`.

- [<Reference title 1 — e.g., "Firebase Crashlytics overview">](https://firebase.google.com/docs/crashlytics) — <One-line description of what this reference grounds in this epic>.
- [<Reference title 2 — e.g., "Get started with Firebase Crashlytics">](https://firebase.google.com/docs/crashlytics/get-started) — <One-line description>.
- [<Reference title 3 — e.g., "Troubleshooting Firebase Crashlytics">](https://firebase.google.com/docs/crashlytics/troubleshooting) — <One-line description>.
