import { Membership } from 'types/auth';
import sitemap, { MenuItem } from 'routes/sitemap';
import { membershipHasPermission } from 'utils/onboarding/access';

/** Sidebar and global search share this filter so nav gating cannot drift. */
export const visibleSitemap = (membership: Membership | null): MenuItem[] =>
  sitemap.filter((item) => {
    if (!item.requiredPermission) {
      return true;
    }

    return membership !== null && membershipHasPermission(membership, item.requiredPermission);
  });
