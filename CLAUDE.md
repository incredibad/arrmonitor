# Claude Code Instructions

## Versioning

**Always bump the version in both `frontend/package.json` and `backend/package.json` before every commit.**

- Bug fixes and visual/UI changes → patch bump (1.x.**Y**)
- New features or behaviour changes → minor bump (1.**Y**.0)

This is non-negotiable — no commit should go out without a version increment in both files.

## Changelog

**Always update `CHANGELOG.md` before every commit.** Add an entry under the correct version heading (create one if it doesn't exist, using the format `## [x.y.z] — YYYY-MM-DD`) that describes the change concisely. Use `### Added`, `### Changed`, or `### Fixed` sub-sections to match the existing style.

This is non-negotiable — no commit should go out without a changelog entry.

## Pushing

**Do not push proactively.** Only push to the remote repository when the user explicitly asks you to.

## Branching workflow

- **`dev`** is the active development branch. All commits go here.
- **`main`** is stable and release-tagged. Only merge `dev` → `main` when the user confirms changes are tested and ready to ship.
- When the user asks to "push changes", push to `dev`.
- When the user asks to cut a release, merge `dev` into `main`, push `main`, then tag the release.
