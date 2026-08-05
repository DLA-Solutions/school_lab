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
 *
 * It is hidden until it is focused. `visuallyHidden` is MUI's own declaration of that pattern —
 * the same nine declarations the date-picker field uses for its hidden input — rather than a
 * local transform far enough up the page to be off screen, which only stayed off screen for as
 * long as nobody changed the offset it was derived from.
 *
 * `component="a"` opts out of the router-aware default of `MuiLink`: this is a same-document
 * fragment jump, which the browser resolves natively onto the target region.
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
