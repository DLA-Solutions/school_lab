import Link from '@mui/material/Link';
import { visuallyHidden } from '@mui/utils';

interface SkipLinkProps {
  /** `id` of the region to jump to. It must be able to take focus (`tabIndex={-1}`). */
  targetId: string;
  children: string;
}

/**
 * First focusable element of the shell, so a keyboard user can jump the 300px sidebar instead of
 * traversing the whole navigation list on every page load.
 */
const SkipLink = ({ targetId, children }: SkipLinkProps) => (
  <Link
    component="a"
    href={`#${targetId}`}
    sx={{
      ...visuallyHidden,
      '&:focus': {
        clip: 'auto',
        height: 'auto',
        width: 'auto',
        margin: 0,
        overflow: 'visible',
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 'tooltip',
        px: 2,
        py: 1,
        borderRadius: 1,
        typography: 'button',
        color: 'text.primary',
        bgcolor: 'background.paper',
        boxShadow: 3,
      },
    }}
  >
    {children}
  </Link>
);

export default SkipLink;
