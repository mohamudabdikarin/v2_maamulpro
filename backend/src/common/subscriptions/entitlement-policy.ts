export const PLAN_FEATURE_KEYS = [
  'construction',
  'realEstate',
  'materials',
  'payroll',
  'advancedReports',
  'prioritySupport',
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];
export type PlanFeatures = Record<PlanFeatureKey, boolean>;
export type PlanLimits = {
  users: number;
  constructionProjects: number;
  properties: number;
};

export type PlanEntitlements = {
  planId?: string;
  planKey?: string;
  planName?: string;
  features: PlanFeatures;
  limits: PlanLimits;
};

const aliases: Record<PlanFeatureKey, string[]> = {
  construction: ['construction', 'constructionEnabled'],
  realEstate: ['realEstate', 'real_estate', 'realEstateEnabled'],
  materials: ['materials', 'materialManagement', 'materialManagementEnabled'],
  payroll: ['payroll', 'payrollEnabled'],
  advancedReports: ['advancedReports', 'reports', 'reporting'],
  prioritySupport: ['prioritySupport'],
};

export function normalizePlanFeatures(value: unknown): PlanFeatures {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return Object.fromEntries(
    PLAN_FEATURE_KEYS.map((key) => [
      key,
      aliases[key].some((alias) => source[alias] === true),
    ]),
  ) as PlanFeatures;
}

export function normalizeLimit(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

export function planEntitlements(plan: any): PlanEntitlements {
  return {
    planId: plan?.id,
    planKey: plan?.key,
    planName: plan?.name,
    features: normalizePlanFeatures(plan?.features),
    limits: {
      users: normalizeLimit(plan?.usersMax, 5),
      constructionProjects: normalizeLimit(plan?.constructionMax),
      properties: normalizeLimit(plan?.propertiesMax),
    },
  };
}

export function isAtLimit(current: number, limit: number): boolean {
  // A zero capacity means unlimited. Disabled modules are enforced separately.
  return limit > 0 && current >= limit;
}

export function addBillingPeriod(startAt: Date, billingCycle: string): Date {
  const result = new Date(startAt);
  if (billingCycle === 'YEARLY') result.setFullYear(result.getFullYear() + 1);
  else result.setMonth(result.getMonth() + 1);
  return result;
}

export function legacyPlanTier(key?: string | null) {
  const normalized = String(key || '').trim().toUpperCase();
  return ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'].includes(normalized)
    ? normalized
    : null;
}

export function hasSubscriptionAccess(company: any, now = new Date()): boolean {
  return company?.status === 'ACTIVE'
    && company?.subscriptionStatus === 'ACTIVE'
    && company?.accessGranted === true
    && Boolean(company?.subscriptionExpiresAt)
    && new Date(company.subscriptionExpiresAt).getTime() > now.getTime();
}
