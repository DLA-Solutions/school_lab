import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface ChatColumnsProps {
  list: ReactNode;
  thread: ReactNode;
  /** On a phone the thread replaces the list until the user goes back. */
  threadOpen: boolean;
  onBack: () => void;
  backLabel: string;
}

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
        minHeight: 420,
        alignItems: 'stretch',
      }}
    >
      {showList && (
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1.5 }}>{list}</Box>
      )}
      {showThread && (
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 360, gap: 1 }}>
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
