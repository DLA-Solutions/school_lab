import { useState, MouseEvent } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconifyIcon from 'components/base/IconifyIcon';
import { formatMonth, recentMonths } from 'utils/month';

interface MonthMenuProps {
  /** Selected month, `YYYY-MM`. */
  value: string;
  onChange: (month: string) => void;
  /** How many months back the list offers, counting the current one. */
  count?: number;
}

/**
 * The overflow control on a card whose figure belongs to one month: it picks which. The glyph is
 * the only thing identifying the button, so it carries `text.secondary` rather than the palette's
 * `neutral.light` — the same #D1DBF9 in both schemes, and 1.38:1 on a white card.
 */
const MonthMenu = ({ value, onChange, count = 12 }: MonthMenuProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const open = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const close = () => setAnchor(null);

  return (
    <>
      <IconButton
        aria-label="menu"
        size="small"
        onClick={open}
        sx={{ color: 'text.secondary', fontSize: 'h5.fontSize' }}
      >
        <IconifyIcon icon="solar:menu-dots-bold" />
      </IconButton>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {recentMonths(count).map((month) => (
          <MenuItem
            key={month}
            selected={month === value}
            onClick={() => {
              onChange(month);
              close();
            }}
          >
            {formatMonth(month)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default MonthMenu;
