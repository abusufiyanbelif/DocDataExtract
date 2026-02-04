
import { get } from "./utils";

export const crudPermissions = ['create', 'read', 'update', 'delete'] as const;
export const readUpdatePermissions = ['read', 'update'] as const;
export const simpleReadPermission = ['read'] as const;
export const donationCategories = ['Zakat', 'Sadqa', 'Interest', 'Lillah', 'Loan', 'Monthly Contribution'] as const;

export type DonationCategory = typeof donationCategories[number];
export type CrudPermissions = typeof crudPermissions;
export type ReadUpdatePermissions = typeof readUpdatePermissions;
export type SimpleReadPermission = typeof simpleReadPermission;

export const campaignSubModules = [
  { id: 'summary', name: 'Summary', permissions: readUpdatePermissions },
  { id: 'ration', name: 'Ration Details', permissions: readUpdatePermissions },
  { id: 'beneficiaries', name: 'Beneficiary List', permissions: crudPermissions },
  { id: 'donations', name: 'Donations', permissions: crudPermissions },
] as const;

export const leadSubModules = [
  { id: 'summary', name: 'Summary', permissions: readUpdatePermissions },
  { id: 'beneficiaries', name: 'Beneficiary List', permissions: crudPermissions },
  { id: 'donations', name: 'Donations', permissions: crudPermissions },
] as const;

export const modules = [
  { id: 'users', name: 'User Management', permissions: crudPermissions },
  {
    id: 'campaigns',
    name: 'Campaigns',
    permissions: ['create', 'update', 'delete'] as const,
    subModules: campaignSubModules,
  },
  { id: 'donations', name: 'Donations', permissions: crudPermissions },
  {
    id: 'leads-members',
    name: 'Leads',
    permissions: ['create', 'update', 'delete'] as const,
    subModules: leadSubModules,
  },
  { id: 'extractor', name: 'Extractor', permissions: simpleReadPermission },
  { id: 'storyCreator', name: 'Story Creator', permissions: simpleReadPermission },
  { id: 'diagnostics', name: 'Diagnostics', permissions: simpleReadPermission },
  { id: 'settings', name: 'Settings', permissions: readUpdatePermissions },
] as const;

export const permissions = ['create', 'read', 'update', 'delete'] as const;

export type ModuleId = typeof modules[number]['id'];
export type Permission = typeof permissions[number];

type SubModulePermissions<T extends Readonly<any[]>> = {
  [K in T[number]['id']]?: Partial<Record<T[number]['permissions'][number], boolean>>;
};

type CampaignPermissions = Partial<Record<Permission, boolean>> & SubModulePermissions<typeof campaignSubModules>;
type LeadPermissions = Partial<Record<"create" | "update" | "delete", boolean>> & SubModulePermissions<typeof leadSubModules>;


export type UserPermissions = Partial<
  Record<Exclude<ModuleId, 'campaigns' | 'leads-members'>, Partial<Record<Permission, boolean>>>
> & {
  campaigns?: CampaignPermissions;
  'leads-members'?: LeadPermissions;
};


export function createAdminPermissions(): UserPermissions {
  const allPermissions: any = {};
  for (const mod of modules) {
    allPermissions[mod.id] = {};
    for (const perm of mod.permissions) {
      allPermissions[mod.id][perm] = true;
    }
    // Manually add the read permission for campaigns for Admins, as it's not in the main list
    if (mod.id === 'campaigns') {
        allPermissions[mod.id].read = true;
    }
     if (mod.id === 'leads-members') {
        allPermissions[mod.id].read = true;
    }
    if ('subModules' in mod && mod.subModules) {
      for (const subMod of mod.subModules) {
        allPermissions[mod.id][subMod.id] = {};
        for (const perm of subMod.permissions) {
          allPermissions[mod.id][subMod.id][perm] = true;
        }
      }
    }
  }
  return allPermissions;
}

export function hasCampaignPermission(userProfile: any, permission: 'create' | 'update' | 'delete' | 'read_any_sub') {
    if (!userProfile) return false;
    if (userProfile.role === 'Admin') return true;

    const campaignPerms = get(userProfile, 'permissions.campaigns', {});

    if (permission === 'read_any_sub') {
        return !!(campaignPerms.summary?.read || campaignPerms.ration?.read || campaignPerms.beneficiaries?.read || campaignPerms.donations?.read);
    }
    return !!campaignPerms[permission];
}

export function hasLeadPermission(userProfile: any, permission: 'create' | 'update' | 'delete' | 'read_any_sub') {
    if (!userProfile) return false;
    if (userProfile.role === 'Admin') return true;

    const leadPerms = get(userProfile, 'permissions.leads-members', {});
    
    if (permission === 'read_any_sub') {
        return !!(leadPerms.summary?.read || leadPerms.beneficiaries?.read || leadPerms.donations?.read);
    }
    return !!leadPerms[permission];
}
