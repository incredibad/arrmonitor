# Claude Code Instructions

## Versioning

**Always bump the version in both `frontend/package.json` and `backend/package.json` before every commit.**

- Bug fixes and visual/UI changes → patch bump (1.x.**Y**)
- New features or behaviour changes → minor bump (1.**Y**.0)

This is non-negotiable — no commit should go out without a version increment in both files.

## Changelog

**Always update `CHANGELOG.md` before every commit.** Add an entry under the correct version heading (create one if it doesn't exist, using the format `## [x.y.z] — YYYY-MM-DD`) that describes the change concisely. Use `### Added`, `### Changed`, `### Fixed`, or `### Security` sub-sections to match the existing style.

This is non-negotiable — no commit should go out without a changelog entry.

## Git & GitHub

**After every commit, push to GitHub.**

```
git push origin main
```

This is non-negotiable — every commit must be pushed immediately after it is created.
