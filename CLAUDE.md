# MaamulPro v2 AI Assistant Rules

To minimize token usage and avoid hitting usage limits, strictly adhere to the following rules:

## 1. Project Context
- **Backend**: NestJS, Prisma, PostgreSQL (Neon). Located in the `backend/` directory.
- **Frontend**: React 18, Vite, Tailwind CSS, Redux Toolkit, Vristo Design System. Located in the `frontend/` directory (historically referred to as `vristo-react-starter`).
- **Database**: Uses Neon pooled connections for the API and direct connections for provisioning/schema updates.

## 2. Token Saving Guidelines
- **DO NOT** read `package.json` to understand the stack. It is already summarized above.
- **DO NOT** run widespread search tools or read entire source code trees to find files. Always refer to `ARCHITECTURE.md` in the root directory for a map of the repository before exploring.
- **DO NOT** re-read configuration unless explicitly asked to modify it.

## 3. Workflow
- For deployment or database questions, refer to `docs/NEON-SETUP.md` and `docs/CUTOVER-RUNBOOK.md` instead of searching the code.
- If the user asks for a new feature, plan it out first referencing the architecture map in `ARCHITECTURE.md`, rather than diving into random files.
