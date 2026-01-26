export const modules = [
  { id: 'users', name: 'User Management' },
  { id: 'campaigns', name: 'Ration Campaigns' },
  { id: 'extractor', name: 'Extractor' },
  { id: 'storyCreator', name: 'Story Creator' },
  { id: 'diagnostics', name: 'Diagnostics' },
] as const;

export const permissions = ['create', 'read', 'update', 'delete'] as const;

export type ModuleId = typeof modules[number]['id'];
export type Permission = typeof permissions[number];

export type UserPermissions = Partial<Record<ModuleId, Partial<Record<Permission, boolean>>>>;
