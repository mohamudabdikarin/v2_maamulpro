import { REPORT_REGISTRY, WORKSPACES } from "@/lib/erp-registry";

export type EnterpriseModuleConfiguration = {
  workspaceControls: Record<string, boolean>;
  sidebarVisibility: Record<string, boolean>;
  reportVisibility: Record<string, boolean>;
  analyticsVisibility: Record<string, boolean>;
};

export const ENTERPRISE_CONFIG_KEY = "enterprise_module_configuration";

export function defaultEnterpriseModuleConfiguration(): EnterpriseModuleConfiguration {
  return {
    workspaceControls: Object.fromEntries(WORKSPACES.map((workspace) => [workspace.key, true])),
    sidebarVisibility: {
      dashboard: true,
      staff: true,
      financials: true,
      reports: true,
      analytics: true,
      audits: true,
      workspaces: true,
      construction: true,
      real_estate: true,
      material_management: true,
    },
    reportVisibility: Object.fromEntries(REPORT_REGISTRY.map((report) => [report.id, true])),
    analyticsVisibility: {
      core: true,
      construction: true,
      real_estate: true,
      material_management: true,
    },
  };
}

export function parseEnterpriseModuleConfiguration(value?: string | null): EnterpriseModuleConfiguration {
  const defaults = defaultEnterpriseModuleConfiguration();
  if (!value) return defaults;

  try {
    const parsed = JSON.parse(value) as Partial<EnterpriseModuleConfiguration>;
    return {
      workspaceControls: { ...defaults.workspaceControls, ...(parsed.workspaceControls ?? {}) },
      sidebarVisibility: { ...defaults.sidebarVisibility, ...(parsed.sidebarVisibility ?? {}) },
      reportVisibility: { ...defaults.reportVisibility, ...(parsed.reportVisibility ?? {}) },
      analyticsVisibility: { ...defaults.analyticsVisibility, ...(parsed.analyticsVisibility ?? {}) },
    };
  } catch {
    return defaults;
  }
}
