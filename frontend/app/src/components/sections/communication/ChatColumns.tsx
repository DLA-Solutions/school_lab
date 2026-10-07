import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { CHAT_PANEL_HEIGHT_PX } from './chatPanelLayout';

const THREAD_HEIGHT = { xs: CHAT_PANEL_HEIGHT_PX, md: '100%' } as const;

interface ChatColumnsProps {
  list: ReactNode;
  thread: ReactNode;
  /** On a phone the thread replaces the list until the user goes back. */
  threadOpen: boolean;
  onBack: () => void;
  backLabel: string;
}

// On a computer the list column's real height is whatever it stacks today — scope toggles,
// start-conversation buttons, the Turma select, two independently-capped scroll boxes
// (chatPanelLayout.ts), the search field — which varies by role and is taller than any single one
// of those boxes. Rather than guess that total, the grid row is left to size itself to the taller
// column (`alignItems` defaults to `stretch`, so we don't override it to `start` here), and the
// thread column stretches to match at `md` and up — `height: '100%'` of the grid area, not a
// number. Below `md` only one column shows at a time (`showList`/`showThread`), so there is no
// taller sibling to stretch to match; the thread pane keeps the fixed `CHAT_PANEL_HEIGHT_PX` there,
// same as before, so its message pane still has a bound to scroll inside of.
//
// `minHeight: 0` is required either way — without it a stretched flex/grid item sizes to its
// content's natural height instead of the constraint it was just given, which would let the
// message pane's `overflow: auto` box grow to fit every message instead of actually scrolling.

/**
 * Two columns on a computer, one on a phone: the list, then the thread, with a way back.
 */
const ChatColumns = ({ list, thread, threadOpen, onBack, backLabel }: ChatColumnsProps) => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('md'));
  const showList = !narrow || !threadOpen;
  const showThread = !narrow || threadOpen;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 320px) minmax(0, 1fr)' },
        gap: 2,
      }}
    >
      {showList && (
        <Box
          sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, gap: 1.5 }}
        >
          {list}
        </Box>
      )}
      {showThread && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
            gap: 1,
            height: THREAD_HEIGHT,
          }}
        >
          {narrow && threadOpen && (
            <Button onClick={onBack} sx={{ alignSelf: 'flex-start' }}>
              {backLabel}
            </Button>
          )}
          {thread}
        </Box>
      )}
    </Box>
  );
};

export default ChatColumns;
