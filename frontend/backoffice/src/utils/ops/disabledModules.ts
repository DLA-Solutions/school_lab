import { SCHOOL_MODULE_KEYS, SchoolModuleKey, SchoolModulesMap } from 'types/modules';

export type DisabledModuleAlert = {
  schoolId: number;
  schoolName: string;
  disabledModules: SchoolModuleKey[];
};

export const disabledModuleKeys = (modules: SchoolModulesMap): SchoolModuleKey[] =>
  SCHOOL_MODULE_KEYS.filter((key) => modules[key] === false);

export const hasAnyModuleDisabled = (modules: SchoolModulesMap): boolean =>
  disabledModuleKeys(modules).length > 0;

export const buildDisabledModuleAlerts = (
  schools: Array<{ id: number; name: string }>,
  modulesBySchool: Record<number, SchoolModulesMap>,
): DisabledModuleAlert[] =>
  schools.flatMap((school) => {
    const modules = modulesBySchool[school.id];

    if (!modules || !hasAnyModuleDisabled(modules)) {
      return [];
    }

    return [
      {
        schoolId: school.id,
        schoolName: school.name,
        disabledModules: disabledModuleKeys(modules),
      },
    ];
  });
