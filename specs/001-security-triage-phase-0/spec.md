# Feature Specification: Security Triage Phase 0

**Feature Branch**: `001-security-triage-phase-0`
**Created**: 2026-03-29
**Status**: Draft
**Input**: Stabilize the Sinai Institute production system by removing critical security and
deployment risks before any new feature development.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Deployment Config No Longer Re-applies Stale Secrets (Priority: P1)

The institute's technical operator deploys the platform to production. After deployment,
the live application uses the correct, current domain URL for authentication, a strong
randomly-generated session secret, and no stale or dead database credentials — regardless
of what is in the repository's deployment configuration file.

**Why this priority**: Every `vercel --prod` currently re-applies a wrong authentication
URL, a weak session secret, and a dead database URL from the deployment config file. This
overwrites correct values set in the platform dashboard, making credential rotation
ineffective and login flows unreliable on the custom domain. This is the highest-severity
blocker.

**Independent Test**: Operator deploys the application and verifies through the platform
dashboard that no environment variables are being overridden by the deployment config
file. The authentication flow works on the custom domain (`test.sinaiinstitute.com`)
immediately after deployment without any dashboard edits.

**Acceptance Scenarios**:

1. **Given** a fresh deployment is triggered, **When** the deployment completes,
   **Then** the authentication URL in the runtime environment matches
   `https://test.sinaiinstitute.com` — not the old `.vercel.app` alias.
2. **Given** a new strong session secret is stored in the platform dashboard,
   **When** the operator deploys, **Then** the deployed application uses the dashboard
   secret — not the old weak secret from the config file.
3. **Given** the deployment config file no longer contains an environment override block,
   **When** the operator inspects the running deployment, **Then** all environment
   variables reflect only values set in the platform dashboard.
4. **Given** the deployment completes, **When** a CMS administrator logs in via
   `https://test.sinaiinstitute.com/login`, **Then** the login succeeds and the session
   cookie is issued for the correct domain.

---

### User Story 2 — Exposed Production Credentials Are Replaced and Invalidated (Priority: P1)

An attacker who previously accessed the git repository cannot use any credential found
there to connect to the production database, upload files to the media service, or
forge session tokens. All previously-exposed credentials have been rotated in their
respective service dashboards and the new values are stored only in the platform
dashboard — never in code.

**Why this priority**: The database password, media service API secret, and session
signing key are currently present in committed files. Rotation is the only effective
remedy for credentials already in git history.

**Independent Test**: Using only what is visible in the public or shared git repository,
an attempt to connect to the production database, authenticate to the media service,
or forge a session token MUST fail. This can be verified by attempting connection with
the old credentials after rotation.

**Acceptance Scenarios**:

1. **Given** the database password has been rotated in the database service dashboard,
   **When** a connection is attempted using the old password visible in git history,
   **Then** the connection is refused.
2. **Given** the media service API secret has been rotated in the media service dashboard,
   **When** an upload is attempted using the old API secret visible in git history,
   **Then** the upload is rejected with an authentication error.
3. **Given** a new session signing secret has been generated and stored in the platform
   dashboard, **When** a session token is constructed using the old weak secret visible
   in git history, **Then** the application rejects the forged token as invalid.
4. **Given** the application source code no longer contains any hardcoded connection
   string, **When** the application starts in the production environment, **Then** it
   reads the database connection string exclusively from the runtime environment variable
   provided by the platform dashboard — and connects successfully.

---

### User Story 3 — Write Operations on Public-Facing Content Require Authorization (Priority: P1)

A malicious actor who is not a logged-in CMS administrator cannot modify, create, or
delete CMS pages — including pages that can execute JavaScript when displayed to public
visitors. Similarly, no unauthenticated actor can upload files to the media service
through the application's upload endpoints.

**Why this priority**: An unauthenticated HTTP request to the page-creation endpoint
can currently inject arbitrary JavaScript that executes in every visitor's browser
(persistent cross-site scripting). This is the highest-severity functional vulnerability
in the system.

**Independent Test**: Without a valid CMS session, send requests to create pages,
modify pages, and upload media. All attempts MUST receive an "unauthorized" response
and produce no side effects (no new page, no uploaded file).

**Acceptance Scenarios**:

1. **Given** no active admin session exists, **When** a request is made to create a new
   CMS page, **Then** the system returns an authorization failure response and creates
   no page.
2. **Given** no active admin session exists, **When** a request is made to modify an
   existing CMS page (including its custom JavaScript field), **Then** the system
   returns an authorization failure response and makes no modification.
3. **Given** no active admin session exists, **When** a request is made to upload an
   image to the application's upload endpoint, **Then** the system returns an
   authorization failure response and uploads nothing to the media service.
4. **Given** a valid admin session exists, **When** any of the above operations is
   performed, **Then** the operation succeeds as before — no legitimate functionality
   is broken.
5. **Given** a public visitor loads a CMS-rendered page, **When** the page content is
   examined, **Then** no JavaScript injected by an unauthenticated actor is present.

---

### User Story 4 — Destructive Data Commands Cannot Target Production by Default (Priority: P2)

A developer running database seed or reset commands from a local machine cannot
accidentally destroy production data. These commands are either blocked from running
without an explicit non-production target, or they require a manual confirmation step
that makes the production risk obvious.

**Why this priority**: The seed command currently runs bulk deletion against the
production database when executed locally, because local development and production
share the same database instance. This risk exists every time a developer sets up
the project.

**Independent Test**: A developer who clones the repository, installs dependencies, and
runs the seed or reset command without any special flags sees a clear failure or
warning — not a silent deletion of production records.

**Acceptance Scenarios**:

1. **Given** a developer has the standard local environment configured (pointing at
   the production database), **When** they run the seed command, **Then** the command
   refuses to run and displays a message explaining that it only runs against
   non-production environments.
2. **Given** the seed command is invoked with an explicit development-environment
   override, **When** a development database URL is provided, **Then** the seed runs
   successfully against the development database.
3. **Given** the production Supabase database, **When** a developer inspects its
   department and news records after attempting a default-configuration seed run,
   **Then** the records are unchanged from before the attempt.

---

### User Story 5 — Deployment Includes a Verified Production Health Check (Priority: P2)

After every production deployment, the operating team can confirm in under five minutes
that: authentication works on the live domain, the database is reachable, and public
pages load correctly. A documented checklist captures the verification steps and their
pass/fail results.

**Why this priority**: There is currently no post-deploy verification step. The last
deployment was 57 days ago, and two committed bug fixes are not live. A structured
health check prevents undetected regressions.

**Independent Test**: After a deployment, the operator follows the post-deploy checklist
and records a pass or fail for each item. All items pass following a successful Phase 0
deployment.

**Acceptance Scenarios**:

1. **Given** a deployment completes, **When** an operator visits `https://test.sinaiinstitute.com`,
   **Then** the public homepage loads without errors.
2. **Given** a deployment completes, **When** the operator navigates to `/login` and
   submits the current admin credentials, **Then** login succeeds and the CMS dashboard
   is accessible.
3. **Given** a deployment completes, **When** the operator visits `/api/departments`,
   **Then** valid department data is returned — confirming database connectivity.
4. **Given** a deployment completes, **When** the operator checks the deployment log
   and runtime environment, **Then** no environment variable override warnings appear
   and all required variables are present.
5. **Given** any post-deploy checklist item FAILS, **When** the operator identifies the
   failure, **Then** a rollback to the previous deployment can be triggered within
   five minutes.

---

### Edge Cases

- What happens if the old credentials are rotated but the application still has the
  hardcoded string compiled into a cached or cached build? The fix must ensure the
  new credentials are read at runtime, not baked in at build time.
- What happens if a legitimate admin performs a CMS action during the authorization
  guard rollout? The guard must return a clear error (not a silent failure or a crash)
  and not corrupt any existing CMS page data.
- What happens if credential rotation causes a database connection failure mid-deploy?
  The rollback procedure must restore the previous working deployment without requiring
  schema changes.
- What happens if the seed command guard is bypassed via a direct `prisma db push`?
  This is outside the scope of this spec; it is addressed by Constitution Principle IV
  requiring a manual backup + `db pull` diff before any schema operation.
- What happens if the debug HTML tool is accessed between spec completion and deployment?
  It should be removed as part of the same deployment batch — not as a separate deploy.

---

## Requirements *(mandatory)*

### Functional Requirements

**Group A — Deployment Configuration**

- **FR-001**: The deployment configuration file MUST NOT contain an environment variable
  override block that supplants platform dashboard values.
- **FR-002**: All production environment variables (authentication URL, session secret,
  database connection, media service credentials) MUST be set exclusively through the
  platform dashboard.
- **FR-003**: The application's database connection MUST be established by reading a
  standard environment variable at runtime — not from a value embedded in source code.

**Group B — Credential Rotation**

- **FR-004**: The database service password MUST be replaced with a new value that
  has never appeared in any committed file.
- **FR-005**: The media service API secret MUST be replaced with a new value that
  has never appeared in any committed file.
- **FR-006**: The session signing secret MUST be replaced with a cryptographically
  strong randomly-generated value that has never appeared in any committed file.
- **FR-007**: The application's local debug database file MUST be removed from version
  control tracking and added to the ignore list to prevent future commits.

**Group C — Authorization Guards**

- **FR-008**: The page creation endpoint MUST reject all requests that do not carry a
  valid administrator session, returning an authorization failure response.
- **FR-009**: The page modification endpoint MUST reject all requests that do not carry
  a valid administrator session, returning an authorization failure response.
- **FR-010**: The media upload endpoint (accessible without session) MUST reject all
  requests that do not carry a valid administrator session, returning an authorization
  failure response.
- **FR-011**: All other existing write endpoints that currently require a session MUST
  continue to enforce their existing session checks — this change MUST NOT regress them.
- **FR-012**: All read-only public endpoints (departments, schedules, public pages) MUST
  remain accessible without session — this change MUST NOT require login for public content.

**Group D — Seed/Reset Safety**

- **FR-013**: The database seed command MUST check the runtime environment indicator
  before executing any destructive operations, and MUST refuse to run if the indicator
  shows a production environment.
- **FR-014**: The seed command, when blocked, MUST display a human-readable message
  explaining why it refused to run and what environment override is required for
  development use.

**Group E — Post-Deploy Verification**

- **FR-015**: A post-deployment verification checklist MUST be produced and documented
  covering at minimum: public homepage load, admin login, database connectivity, and
  absence of environment override warnings.
- **FR-016**: The system MUST remain rollback-capable within five minutes of a failed
  deployment, using the previous known-good deployment.
- **FR-017**: A developer debug tool currently accessible to the public MUST be removed
  from the production-serving file tree.

### Key Entities

- **Production Environment Variables**: The set of runtime configuration values
  (authentication URL, session secret, database connection string, media credentials)
  that govern production application behavior. Must be stored exclusively in the
  platform dashboard after this change.
- **CMS Administrator Session**: A validated, server-side confirmed identity token
  that proves the requester is a logged-in admin. The sole gate for all mutating
  CMS operations after this change.
- **Deployment Configuration File** (`vercel.json`): The checked-in file that
  controls the build and deployment process. After this change, it MUST control only
  build settings — no environment value overrides.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After deployment, a request to create a CMS page without an admin session
  receives an authorization failure in 100% of attempts — verified by at least 3
  independent test requests.
- **SC-002**: After credential rotation, connection attempts to the production database
  using credentials visible in git history are refused in 100% of attempts.
- **SC-003**: After deployment, an admin login on `https://test.sinaiinstitute.com/login`
  succeeds on the first attempt using current credentials — confirming both the correct
  domain URL and a valid session secret are active.
- **SC-004**: After deployment, the public homepage, at least one CMS-managed dynamic
  page, and the departments API all return successful responses — confirming no
  legitimate functionality was broken.
- **SC-005**: The post-deploy verification checklist records a pass for all five items
  within five minutes of deployment completion.
- **SC-006**: A developer who runs the seed command with default local configuration
  receives an explicit refusal message — not a silent error and not a successful seed
  run against production data.
- **SC-007**: No environment variable name or secret value related to this project
  appears in any file that would be committed to version control after this change.
- **SC-008**: The debug HTML tool is no longer reachable at its current public URL
  after deployment.

---

## Assumptions

- The platform dashboard (Vercel) allows setting environment variables without
  redeploying — new secrets can be set before the coordinated deploy.
- Credential rotation in external service dashboards (database service, media service)
  can be performed by the institute's operator without downtime, as the application
  connection is re-established on each serverless function invocation.
- The existing single CMS admin session mechanism is sufficient for the authorization
  guards in this phase — no new user management or role differentiation is introduced.
- The media upload endpoint is used exclusively by logged-in CMS administrators in the
  current production workflow; requiring a session will not block any legitimate public
  use.
- The rollback mechanism provided by the deployment platform (promoting a previous
  deployment) is sufficient for disaster recovery in this phase — no database rollback
  is needed, as no schema changes are included.
- The current administrator credentials (`admin@sainaiinstitute.com` / `admin123`) will
  remain unchanged during this phase — changing auth credentials is explicitly deferred
  to Phase 1 (fixing DB-backed authentication).
- Removing the commit-tracked local database file from version control will not affect
  production — the production database is on the external database service, not a local
  file.
- No new Prisma schema models or fields are required. All changes are to configuration
  files, source code logic, and external dashboard settings.
