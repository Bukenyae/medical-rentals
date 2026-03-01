# BelleRouge Security Automation Spec (v1)

## Objective
Run a recurring security watch across local workspace, production surface, and `BelleRouges.com`, then notify every 30 minutes with:
- `GREEN` highlight when safe (no High/Critical findings)
- `RED` highlight when exposed or likely to be exposed

Only High/Critical risk is reported to reduce noise.

## Scope
- Local environment:
  - Dependency vulnerabilities (High/Critical)
  - Secret leakage indicators in tracked files/config
  - Dangerous auth/config drift
- Production environment:
  - Targets: `production` and `staging` (both mandatory each cycle)
  - Public endpoint hardening (headers, TLS, cert age, transport policy)
  - Exposed admin/debug routes and misconfiguration indicators
  - High/Critical findings from deployment/runtime checks
- Domain surface (`BelleRouges.com`):
  - DNS misconfiguration and suspicious changes
  - TLS validity/expiry, weak protocol/cipher exposure
  - High-risk web exposure indicators

## Severity Gate
- Include only:
  - `CRITICAL`
  - `HIGH`
- Ignore lower severities unless they are prerequisites to a High/Critical chain.

## Cadence
- Frequency: every 30 minutes
- Trigger behavior:
  - Always send status update (`GREEN` or `RED`)
  - If status is `RED`, include actionable remediation swarm plan

## Notification Contract
Each run must produce one status block:
- Destination: Codex sidebar/thread notification surface (same channel used for approval prompts), with explicit `GREEN` or `RED` status label.

### GREEN Block
- Label: `GREEN - SAFE`
- Meaning: No High/Critical findings detected in current run
- Include:
  - Timestamp (UTC and local)
  - Last full scan duration
  - Surfaces checked: Local, Production, Domain
  - Confidence note and any blind spots

### RED Block
- Label: `RED - EXPOSED` (or `RED - PRE-EXPOSURE RISK`)
- Meaning: At least one High/Critical finding exists, or strong indicator of near-term exposure
- Include:
  - Finding ID
  - Severity (`HIGH`/`CRITICAL`)
  - Affected surface
  - Evidence summary
  - Business impact
  - Immediate containment step
  - Swarm remediation tasks
  - Estimated time-to-mitigate

## Pre-Exposure Definition
Use `RED - PRE-EXPOSURE RISK` when heuristics indicate likely imminent exposure:
- TLS certificate nearing expiry window
- Security control unexpectedly disabled
- New publicly reachable sensitive route
- Newly introduced secret pattern in active branch or deploy artifact
- Local code smells that imply likely exploitability if merged/deployed, including:
  - auth/authorization bypass patterns
  - unsanitized input into DB/query/shell paths
  - missing server-side validation on security-sensitive mutations
  - permissive CORS/session/cookie/security header regressions
  - exposure of privileged env vars or keys in client bundles/logs

## Plan-Mode Breakdown (First to Last)
1. Intake + classify:
   - Parse finding and confirm severity and blast radius.
2. Validate:
   - Reproduce with one independent check to reduce false positives.
3. Contain:
   - Apply reversible containment (block route, rotate key, disable vulnerable path).
4. Stabilize:
   - Verify customer-facing impact and keep core flows healthy.
5. Root cause:
   - Identify introducing commit/config/pipeline source.
6. Patch:
   - Implement smallest safe fix and add guardrails.
7. Verify:
   - Re-run checks on local, production, and domain surfaces.
8. Approve + execute:
   - Request explicit user approval before irreversible or high-impact steps.
9. Monitor:
   - Confirm no recurrence for 2 consecutive cycles.
10. Close:
   - Publish resolution summary and prevention controls.

## Swarm Remedy Format
When status is `RED`, emit remediation in swarm lanes:
- `Swarm A - Containment`: immediate blast-radius reduction
- `Swarm B - App Fix`: code/config patch and tests
- `Swarm C - Infra/Domain`: DNS/TLS/WAF/headers hardening
- `Swarm D - Validation`: proof of fix and regression checks
- `Swarm E - Comms`: stakeholder update and incident notes

Each lane must include:
- Owner
- Exact task
- Command or change target
- Success condition
- ETA

## Approval Policy
- Automation may assess and report automatically.
- Execution of disruptive fixes requires explicit user approval.
- Non-disruptive low-risk hardening can be pre-staged but not applied without approval.

## Limits and Assumptions
- If production credentials or scanners are unavailable, mark status confidence as reduced.
- Domain checks depend on current DNS/TLS observability.
- Pre-exposure is heuristic, not a certainty claim.
