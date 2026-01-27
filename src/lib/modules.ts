export const crudPermissions = ['create', 'read', 'update', 'delete'] as const;
export const readUpdatePermissions = ['read', 'update'] as const;
export const simpleReadPermission = ['read'] as const;

export type CrudPermissions = typeof crudPermissions;
export type ReadUpdatePermissions = typeof readUpdatePermissions;
export type SimpleReadPermission = typeof simpleReadPermission;

export const campaignSubModules = [
  { id: 'summary', name: 'Summary', permissions: readUpdatePermissions },
  { id: 'ration', name: 'Ration Details', permissions: readUpdatePermissions },
  { id: 'beneficiaries', name: 'Beneficiary List', permissions: crudPermissions },
  { id: 'donations', name: 'Donations', permissions: crudPermissions },
] as const;

export const modules = [
  { id: 'users', name: 'User Management', permissions: crudPermissions },
  {
    id: 'campaigns',
    name: 'Campaigns',
    permissions: crudPermissions,
    subModules: campaignSubModules,
  },
  { id: 'extractor', name: 'Extractor', permissions: simpleReadPermission },
  { id: 'storyCreator', name: 'Story Creator', permissions: simpleReadPermission },
  { id: 'diagnostics', name: 'Diagnostics', permissions: simpleReadPermission },
] as const;

export const permissions = ['create', 'read', 'update', 'delete'] as const;

export type ModuleId = typeof modules[number]['id'];
export type Permission = typeof permissions[number];

type SubModulePermissions = {
  [K in typeof campaignSubModules[number]['id']]?: Partial<Record<typeof campaignSubModules[number]['permissions'][number], boolean>>;
};

export type UserPermissions = Partial<
  Record<Exclude<ModuleId, 'campaigns'>, Partial<Record<Permission, boolean>>>
> & {
  campaigns?: Partial<Record<Permission, boolean>> & SubModulePermissions;
};

export function createAdminPermissions(): UserPermissions {
  const allPermissions: any = {};
  for (const mod of modules) {
    allPermissions[mod.id] = {};
    for (const perm of mod.permissions) {
      allPermissions[mod.id][perm] = true;
    }
    if (mod.subModules) {
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
