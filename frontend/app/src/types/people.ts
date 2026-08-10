import { Membership, RoleTemplate } from 'types/auth';
import { Paginated } from 'types/academics';

/** Mirrors `MembershipBlueprint` on list and PATCH permissions responses. */
export type TeamMembership = Membership;

export interface PermissionDefinition {
  key: string;
  domain: string;
  scope_kinds: string[];
}

export interface RoleTemplatePermission {
  permission_key: string;
  scope_kind: string;
}

/** `GET /role_templates` detail view — includes baseline permissions. */
export interface RoleTemplateDetail extends RoleTemplate {
  permissions: RoleTemplatePermission[];
}

export interface PermissionDefinitionsResponse {
  data: {
    definitions: PermissionDefinition[];
  };
}

export interface MembershipOverridesPayload {
  grants: string[];
  denies: string[];
}

export interface MembershipPermissionsResponse {
  data: TeamMembership;
}

export type MembershipListResponse = Paginated<TeamMembership>;
