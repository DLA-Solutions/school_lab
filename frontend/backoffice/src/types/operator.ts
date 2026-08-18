/** Read-only backoffice operator row from GET /platform/operators (UC-BOE09). */
export type PlatformOperator = {
  id: number;
  email: string;
  status: 'active' | 'disabled';
  platform_permissions: string[];
};
