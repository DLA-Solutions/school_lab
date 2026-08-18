import { Paginated } from 'types/academics';
import { SchoolGroup, SchoolGroupMember, SchoolGroupPayload } from 'types/schoolGroup';
import { request } from './api';

const PATH = '/api/v1/platform/school_groups';

export const listSchoolGroups = (page = 1) =>
  request<Paginated<SchoolGroup>>(`${PATH}?page=${page}`);

export const getSchoolGroup = async (id: number): Promise<SchoolGroup> => {
  const response = await request<{ data: SchoolGroup }>(`${PATH}/${id}`);
  return response.data;
};

export const createSchoolGroup = async (payload: SchoolGroupPayload): Promise<SchoolGroup> => {
  const response = await request<{ data: SchoolGroup }>(PATH, {
    method: 'POST',
    body: { school_group: payload },
  });

  return response.data;
};

export const updateSchoolGroup = async (
  id: number,
  payload: Partial<SchoolGroupPayload>,
): Promise<SchoolGroup> => {
  const response = await request<{ data: SchoolGroup }>(`${PATH}/${id}`, {
    method: 'PATCH',
    body: { school_group: payload },
  });

  return response.data;
};

export const deleteSchoolGroup = (id: number) =>
  request<null>(`${PATH}/${id}`, { method: 'DELETE' });

export const listSchoolGroupSchools = async (groupId: number): Promise<SchoolGroupMember[]> => {
  const response = await request<{ data: SchoolGroupMember[] }>(`${PATH}/${groupId}/schools`);
  return response.data;
};

export const assignSchoolToGroup = async (
  groupId: number,
  schoolId: number,
): Promise<SchoolGroupMember> => {
  const response = await request<{ data: SchoolGroupMember }>(
    `${PATH}/${groupId}/assign_school`,
    {
      method: 'POST',
      body: { school_id: schoolId },
    },
  );

  return response.data;
};

export const unassignSchoolFromGroup = (groupId: number, schoolId: number) =>
  request<null>(`${PATH}/${groupId}/schools/${schoolId}`, { method: 'DELETE' });
