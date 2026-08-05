import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import { AA_TEXT, computedColor, contrastRatio, paletteColor } from 'test/contrast';

const SCHEMES: ColorScheme[] = ['light', 'dark'];

// The overrides that change what a component *does* rather than how it looks. Appearance is
// reviewed in the catalog; these are the contracts a call site silently depends on.
describe('theme component overrides', () => {
  describe('MuiTypography', () => {
    it('renders the subtitle variants as paragraphs, not headings', () => {
      renderWithTheme(
        <>
          <Typography variant="subtitle1">Lead</Typography>
          <Typography variant="subtitle2">Label</Typography>
        </>,
      );

      expect(screen.getByText('Lead').tagName).toBe('P');
      expect(screen.getByText('Label').tagName).toBe('P');
      expect(screen.queryAllByRole('heading')).toHaveLength(0);
    });

    it('keeps the heading variants mapped to heading elements', () => {
      renderWithTheme(<Typography variant="h6">Students</Typography>);

      expect(screen.getByRole('heading', { name: 'Students', level: 6 })).toBeInTheDocument();
    });

    it('lets a call site promote a subtitle back to a heading', () => {
      renderWithTheme(
        <Typography variant="subtitle1" component="h2">
          Enrolment
        </Typography>,
      );

      expect(screen.getByRole('heading', { name: 'Enrolment', level: 2 })).toBeInTheDocument();
    });
  });

  describe('MuiPagination', () => {
    it('colours the items primary without the prop', () => {
      const { container } = renderWithTheme(<Pagination count={3} page={1} />);

      expect(container.querySelector('.MuiPaginationItem-colorPrimary')).toBeInTheDocument();
    });
  });

  describe('MuiSnackbar', () => {
    it('anchors bottom-right, clear of the sidebar', () => {
      const { container } = renderWithTheme(<Snackbar open message="Enrolment saved" />);

      expect(container.querySelector('.MuiSnackbar-anchorOriginBottomRight')).toBeInTheDocument();
    });

    it('dismisses itself after the default duration', () => {
      vi.useFakeTimers();
      try {
        const onClose = vi.fn();
        renderWithTheme(<Snackbar open onClose={onClose} message="Enrolment saved" />);

        vi.advanceTimersByTime(5999);
        expect(onClose).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onClose).toHaveBeenCalledOnce();
      } finally {
        vi.useRealTimers();
      }
    });

    it('stays open when a call site opts out of the timer', () => {
      vi.useFakeTimers();
      try {
        const onClose = vi.fn();
        renderWithTheme(
          <Snackbar open autoHideDuration={null} onClose={onClose} message="Upload in progress" />,
        );

        vi.advanceTimersByTime(30000);
        expect(onClose).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('MuiPopover', () => {
    it('does not reach the paper of a Menu', () => {
      renderWithTheme(
        <Menu open anchorEl={document.body}>
          <MenuItem>Profile</MenuItem>
        </Menu>,
      );

      // Menu composes Popover, so both slots style the same element. The Popover override is
      // scoped behind `:not(.MuiMenu-paper)` precisely so the Menu keeps the zero padding the
      // Paper override gives it — a menu with 16px of inset padding would be visibly wrong.
      const paper = document.querySelector('.MuiMenu-paper') as HTMLElement;
      expect(paper).toHaveClass('MuiPopover-paper');
      expect(getComputedStyle(paper).padding).toBe('0px');
    });
  });

  describe('MuiBackdrop', () => {
    it('leaves the backdrop of a menu invisible', () => {
      renderWithTheme(
        <Menu open anchorEl={document.body}>
          <MenuItem>Profile</MenuItem>
        </Menu>,
      );

      // The Backdrop override paints only `:not(.MuiBackdrop-invisible)`. If MUI ever stopped
      // marking the dropdown backdrop this way, every open Select would gain a scrim.
      const backdrop = document.querySelector('.MuiBackdrop-root');
      expect(backdrop).toHaveClass('MuiBackdrop-invisible');
    });
  });

  // Every pairing here is one an override paints on top of a token, in a place where the token
  // alone cannot be trusted: `error.main` is a fill as well as a foreground, and `neutral.*` holds
  // the same hex in both schemes. The ratio is asserted rather than the colour name, so a token
  // that moves underneath the override fails the spec instead of quietly failing WCAG. Measured
  // inventory: `docs/guidelines/web-ui/accessibility.md`.
  describe('contrast (WCAG 2.1 SC 1.4.3)', () => {
    describe.each(SCHEMES)('%s scheme', (mode) => {
      it('reads the destructive confirm label against the error fill', () => {
        renderWithTheme(
          <Button color="error" variant="contained">
            Delete
          </Button>,
          { mode },
        );

        const label = computedColor(screen.getByRole('button', { name: 'Delete' }), 'color');

        // The root override paints every Button label `text.primary`; inheriting it here gives
        // 3.04:1 in dark and 2.98:1 in light on the confirm control of a destructive action.
        expect(contrastRatio(label, paletteColor('error.main'))).toBeGreaterThanOrEqual(AA_TEXT);
      });

      it('keeps the gradient primary label white, which is what waiver W3 accepts', () => {
        renderWithTheme(
          <Button color="primary" variant="contained">
            Save
          </Button>,
          { mode },
        );

        const label = computedColor(screen.getByRole('button', { name: 'Save' }), 'color');

        // The gradient is identical in both schemes and no flat label beats 3.73:1 across it, so
        // W3 waives the shortfall — but only for white. Light inheriting `text.primary` (#171923)
        // drops the worst stop to 2.97:1, which is outside the waiver.
        expect(contrastRatio(label, '#FFFFFF')).toBe(1);
        expect(
          Math.min(
            contrastRatio(label, paletteColor('gradients.primary.main')),
            contrastRatio(label, paletteColor('gradients.primary.state')),
          ),
        ).toBeGreaterThan(3.7);
      });

      it('reads both pagination digits in the table footer', () => {
        renderWithTheme(<Pagination count={3} page={1} />, { mode });

        const selected = document.querySelector('.MuiPaginationItem-root.Mui-selected')!;
        const unselected = document.querySelector('.MuiPaginationItem-root:not(.Mui-selected)')!;

        // `neutral.light` is the same #D1DBF9 in both schemes: 1.38:1 on a white card unselected,
        // 2.70:1 on the brand purple selected.
        expect(
          contrastRatio(computedColor(unselected, 'color'), paletteColor('background.paper')),
        ).toBeGreaterThanOrEqual(AA_TEXT);
        expect(
          contrastRatio(computedColor(selected, 'color'), paletteColor('primary.main')),
        ).toBeGreaterThanOrEqual(AA_TEXT);
      });

      it('reads the tooltip label on its inverted plate', () => {
        renderWithTheme(
          <Tooltip open title="Toggle theme">
            <span>anchor</span>
          </Tooltip>,
          { mode },
        );

        const tooltip = document.querySelector('.MuiTooltip-tooltip')!;

        // The plate is `neutral.darker` in *both* schemes, so a `text.primary` label is 1.57:1 in
        // light. Tooltips are live in the topbar.
        expect(
          contrastRatio(computedColor(tooltip, 'color'), paletteColor('neutral.darker')),
        ).toBeGreaterThanOrEqual(AA_TEXT);
      });
    });
  });
});
