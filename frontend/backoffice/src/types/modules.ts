/** MVP module keys seeded on school create (school-module-flags PRD). */
export type SchoolModuleKey = 'communication' | 'academic' | 'billing' | 'documents';

export type SchoolModulesMap = Record<SchoolModuleKey, boolean>;

export const SCHOOL_MODULE_KEYS: SchoolModuleKey[] = [
  'communication',
  'academic',
  'billing',
  'documents',
];
