# AI Agent Navigation Index

Start with a feature domain in `graph.json`, follow only its direct `PART_OF_FEATURE` members, then expand `CALLS`, `IMPORTS`, `CALLS_API`, `ROUTES_TO`, `HANDLED_BY`, `USES_SERVICE`, `REQUIRES_PERMISSION`, and model edges as needed. Do not scan unrelated folders first.

## Authentication & Authorization

Purpose: session identity, RBAC, permission checks, and permission-aware UI. Start at backend auth/RBAC guards and decorators, then frontend sidebar/layout permission logic. Trace permissions through user-role loading, guarded controllers, services, and tenant database access.

## Properties / Buildings / Blocks / Units

Purpose: property and tenancy domain management. Start at property, building, block, unit, and real-estate pages or APIs; follow their controllers, services, DTOs, permission checks, and Prisma-backed data access.

## Finance / Accounting

Purpose: transactions, accounting entries, financial reports, invoices, and payments. Start from financial/accounting pages or controllers, then follow services, DTOs, ledger/report utilities, permissions, and database models.

## Construction

Purpose: projects, contracts, tasks, expenses, and construction operations. Start from construction pages/controllers; follow service, DTO, role/permission, and project-related model edges.

## Payroll / HR

Purpose: staff, workforce, payroll, attendance, and related workflows. Start at payroll/staff modules and their frontend pages; follow controller → service → DTO → model paths and role checks.

## Rentals / Leases

Purpose: rentals, lease contracts, and rent payments. Start from rental/lease symbols and expand to property/unit, payment, authorization, and persistence edges.

## Inventory / Materials

Purpose: stock, materials, purchases, suppliers, and inventory movements. Start from inventory/material pages or controllers, then trace services, DTOs, permissions, and transaction/model links.

## Shared UI / Utilities

Purpose: reusable components, layouts, hooks, state, API clients, and formatting utilities. Use this domain only after identifying a feature, then follow it back to the relevant feature domain.

## Database / Prisma

Purpose: schemas, Prisma configuration, tenant connections, migrations, and database utilities. Use for persistence, tenant routing, or model-impact work.

## API / Backend Infrastructure

Purpose: NestJS modules, routes, guards, middleware, interceptors, service wiring, and platform configuration. Use for request lifecycle, cross-cutting authorization, and API routing questions.
