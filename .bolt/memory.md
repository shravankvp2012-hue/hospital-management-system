# Project memory

## Product intent & audience

- **MediCore**: medical/healthcare application requiring authenticated access.
- User roles: **Master** (admin) and **normal users**; Master can create normal users from an admin screen.
- Intended for production use with real user management.

## Brand personality & voice

- Professional, medical-grade tone; security-conscious messaging (setup codes treated like passwords).

## Visual design & UX direction

- Sign-in screen includes a **"First time setting up MediCore?"** link/path for initial Master account creation.
- Setup form fields: full name, username, email, password, confirm password, one-time setup code.
- Post-login: Master administration screen for creating normal user accounts.

## Decisions, constraints & rationale

- **One-time setup code** gates Master account creation; code is single-use and only valid while Master setup is pending.
- Once Master account exists, the setup code can no longer be used — prevents unauthorized account creation.
- Setup code format observed: `MEDICORE-XXXXXXXX` (uppercase prefix + hex-style suffix).
- Assistant cannot log in on user's behalf; can only reset/provide setup codes as a blocker-removal mechanism.

## Open questions & assumptions

- Assumption: only one Master account is intended per deployment.
- Unverified: how normal users are created (fields, roles, permissions) beyond "Master administration screen."
- Unverified: password policy beyond minimum length (observed `12345678` accepted = 8 chars).