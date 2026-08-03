# Neon Database Setup

This document outlines the database provisioning and setup process.

## Architecture

We use **Neon Serverless PostgreSQL** for both central configuration and tenant data isolation.
- **Central Schema**: Stores metadata about tenants, routing information, and shared settings.
- **Tenant Schema**: Distinct database logic for each tenant.

## Local Configuration

1. Create a Neon account and provision a database cluster.
2. Setup the `.env` variables according to `backend/.env.example`.
3. Use the pooled connection strings for Prisma execution.
4. Use the direct connection string for Prisma schema changes and seeding.

## Encryption
Tenant connection credentials are encrypted at rest inside the central database to ensure high security boundaries. Make sure `ENCRYPTION_KEY` is configured securely in the environment.

## Commands

```bash
cd backend
pnpm run neon:setup
```

*(This file is part of the MaamulPro architecture guidelines and provides the AI with targeted context instead of forcing it to scan code for setup scripts.)*
