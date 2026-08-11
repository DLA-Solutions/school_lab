/** Mirrors `UserBlueprint` list view (`web/app/blueprints/user_blueprint.rb`). */
export type UserStatus = 'active' | 'disabled';

export type PlatformUserMembership = {
  role: string;
  school_name: string | null;
};

export type PlatformUser = {
  id: number;
  email: string;
  status: UserStatus;
  memberships: PlatformUserMembership[];
};
