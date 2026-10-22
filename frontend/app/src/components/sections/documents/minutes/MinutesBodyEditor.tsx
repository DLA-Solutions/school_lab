import { useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { useTranslation } from 'providers/I18nContext';
import { sanitizeMinutesHtml } from 'utils/sanitizeMinutesHtml';

export interface MinutesBodyEditorProps {
  /** Initial HTML only — the editor owns the content afterwards and reports each change. */
  initialValue: string;
  onChange: (html: string) => void;
  error?: string;
  disabled?: boolean;
}

interface Command {
  id: string;
  icon: string;
  labelKey:
    | 'minutes.editor.bold'
    | 'minutes.editor.italic'
    | 'minutes.editor.heading'
    | 'minutes.editor.paragraph'
    | 'minutes.editor.bulletList'
    | 'minutes.editor.numberedList';
  run: () => void;
}

// `execCommand` is deprecated on paper but is still the only dependency-free way to edit rich text
// in a `contentEditable` element in every shipping browser, and the editor's output is re-sanitized
// to the API's allowlist (`utils/sanitizeMinutesHtml`) so its quirks never reach the wire.
const exec = (command: string, value?: string) => {
  document.execCommand(command, false, value);
};

const COMMANDS: Command[] = [
  {
    id: 'bold',
    icon: 'mingcute:bold-line',
    labelKey: 'minutes.editor.bold',
    run: () => exec('bold'),
  },
  {
    id: 'italic',
    icon: 'mingcute:italic-line',
    labelKey: 'minutes.editor.italic',
    run: () => exec('italic'),
  },
  {
    id: 'heading',
    icon: 'mingcute:heading-2-line',
    labelKey: 'minutes.editor.heading',
    run: () => exec('formatBlock', 'h2'),
  },
  {
    id: 'paragraph',
    icon: 'mingcute:paragraph-line',
    labelKey: 'minutes.editor.paragraph',
    run: () => exec('formatBlock', 'p'),
  },
  {
    id: 'ul',
    icon: 'mingcute:list-check-line',
    labelKey: 'minutes.editor.bulletList',
    run: () => exec('insertUnorderedList'),
  },
  {
    id: 'ol',
    icon: 'mingcute:numbered-list-ltr-line',
    labelKey: 'minutes.editor.numberedList',
    run: () => exec('insertOrderedList'),
  },
];

/**
 * A minimal rich-text field for the ata body, limited to what the API keeps: headings,
 * paragraphs, lists, bold and italic (`docs/api/v1/documents-and-archive.md` § Livro Ata). No
 * editor dependency is added for it — the repo has none, and the allowlist is small.
 */
const MinutesBodyEditor = ({
  initialValue,
  onChange,
  error,
  disabled = false,
}: MinutesBodyEditorProps) => {
  const { t } = useTranslation();
  const surface = useRef<HTMLDivElement | null>(null);
  const initial = useRef(initialValue);

  useEffect(() => {
    if (surface.current) {
      surface.current.innerHTML = sanitizeMinutesHtml(initial.current);
    }
  }, []);

  const emit = useCallback(() => {
    if (surface.current) {
      onChange(sanitizeMinutesHtml(surface.current.innerHTML));
    }
  }, [onChange]);

  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary" id="minutes-body-label">
        {t('minutes.form.body')}
      </Typography>
      <Box
        sx={{
          border: 1,
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ p: 0.5, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}
          role="toolbar"
          aria-label={t('minutes.form.body')}
        >
          {COMMANDS.map((command) => (
            <Tooltip key={command.id} title={t(command.labelKey)}>
              <span>
                <IconButton
                  size="small"
                  disabled={disabled}
                  aria-label={t(command.labelKey)}
                  // Keeps the text selection inside the editor while the button is pressed.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    surface.current?.focus();
                    command.run();
                    emit();
                  }}
                >
                  <IconifyIcon icon={command.icon} />
                </IconButton>
              </span>
            </Tooltip>
          ))}
        </Stack>
        <Box
          ref={surface}
          role="textbox"
          aria-multiline="true"
          aria-labelledby="minutes-body-label"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          sx={{
            minHeight: 180,
            maxHeight: 360,
            overflowY: 'auto',
            p: 1.5,
            outline: 'none',
            '&:focus-visible': {
              boxShadow: (theme) => `inset 0 0 0 2px ${(theme.vars || theme).palette.primary.main}`,
            },
            '& h1, & h2, & h3, & h4': { m: 0, mb: 1, fontWeight: 500 },
            '& p': { m: 0, mb: 1 },
            '& ul, & ol': { mt: 0, mb: 1, pl: 3 },
          }}
        />
      </Box>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
};

export default MinutesBodyEditor;
