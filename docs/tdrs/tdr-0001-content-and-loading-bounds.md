# TDR 0001: Content, evidence and import bounds

Task #1. Every record has an explicit string type/version and rejects unknown
fields/versions. Schema configuration defaults never supply absent wire identity.
Manifest/qualification bounds are 16 KiB UTF-8; content inventories are 256 KiB.
References are opaque bounded IDs plus lowercase SHA-256 digests, without URLs,
reviewer identities or private legal text. Parsers return detached records and
fixed diagnostics. Malformed existing records are errors, not absent evidence.

Content supports at most 300 individually authored challenges with distinct
IDs/artifact IDs/digests and bounded objectives, exactly three distinct difficulty
profiles for completeness, up to 100 mastery goals and explicit endless
validation. Puzzles require a solver or solution witness. Actions require bounded
difficulty, reachability, safe starts and reaction-time guarantees. These describe
evidence requirements; each game's tested implementation must establish them.

Human evidence requires 600 meaningful active minutes, more than half on touch,
desktop parity and independent depth approval. Device, WCAG 2.2 AA, every exact
solo/online mode's authority and main-CD/secret-reference/public-artifact reviews
remain distinct requirements. Claims bind exact game/rules/content versions and
implementation artifact. An empty structural gap list is not trusted review,
entitlement or permission to launch. The host owns evidence freshness and trust.

Lazy loaders admit only the explicit 24-game registry. Default timeout: 5 seconds;
range: 10–30,000 ms. At most four import evaluations remain pending. Timed-out or
cancelled imports retain a slot until their promise settles because module
evaluation is not cancellable. Callers receive a fixed status and no retry or
queued work. Listeners/timers are cleaned, late results ignored and thrown import
diagnostics suppressed. Capacity is process/loader-local, not a service quota.

The root keeps game imports external to its bundle through an explicit path
pattern tested against actual ESM/CJS output. Every game is built independently,
with maps and dual declarations. The exact 153-path inventory excludes private
records and unintended assets. Future game exports/content must deliberately
update their reviewed package contract; no wildcard public export is allowed.
