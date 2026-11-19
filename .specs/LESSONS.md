# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Test each guard in a setup where that guard alone decides the outcome, not behind an outer condition that already blocks it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: learning-platform
- evidence: M9 src/hooks/useAppShortcuts.ts:49 (iteration 0) (hooks)
- last seen: 2026-11-19T11:01:43Z

### L-002 - Give every keyboard shortcut named in an AC its own test that presses that exact key
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: learning-platform
- evidence: M11 src/hooks/useAppShortcuts.ts:56 (iteration 0) (hooks)
- last seen: 2026-11-19T11:01:43Z

### L-003 - When a contrast AC names components, enumerate the actual foreground/background pairs in the spec so the test can cover them
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `styles` · harmful: 0
- features: learning-platform
- evidence: THM-01.3 src/styles/contrast.test.ts:45 (styles)
- last seen: 2026-11-19T11:01:43Z

### L-004 - Turn editorial content ACs into a mechanical rule the validator can check, or label them as review-only in the spec
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `content` · harmful: 0
- features: learning-platform
- evidence: CNT-01.2 (content)
- last seen: 2026-11-19T11:01:43Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
