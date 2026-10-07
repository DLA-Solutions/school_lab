import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { CHAT_PANEL_HEIGHT_PX } from './chatPanelLayout';

interface ChatColumnsProps {
  list: ReactNode;
  thread: ReactNode;
  /** On a phone the thread replaces the list until the user goes back. */
  threadOpen: boolean;
  onBack: () => void;
  backLabel: string;
}

// The thread pane's messages only scroll inside their own pane when something in this ancestor
// chain actually stops growing — an `overflow: auto` box under an unbounded parent just grows
// forever. `CHAT_PANEL_HEIGHT_PX` is that bound, and it is the exact same number the conversation
// list next to it caps its own scroll area at (chatPanelLayout.ts) — fixed, not viewport-relative
// — so the two columns render as one matched pair at the same height instead of two numbers that
// happen to look close. `alignItems: 'start'` keeps the list column (sized to its own content,
// capped independently below) from being stretched to match this height, or vice versa.

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
        alignItems: 'start',
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
            height: CHAT_PANEL_HEIGHT_PX,
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
