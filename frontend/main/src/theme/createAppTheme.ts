import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';
import type {} from '@mui/x-date-pickers/themeAugmentation';
import { tokens } from '@school-lab/design-tokens';
import './palette';
import typography from './typography';
import { mapTokensToPalette } from './mapTokensToPalette';
import { darkCustomShadows } from './shadows';

import CssBaseline from './components/utils/CssBaseline';
import Button from './components/button/Button';
import ButtonBase from './components/button/ButtonBase';
import IconButton from './components/button/IconButton';
import Toolbar from './components/button/Toolbar';
import Stack from './components/layout/Stack';
import Paper from './components/surface/Paper';
import Checkbox from './components/input/Checkbox';
import Radio from './components/input/Radio';
import Switch from './components/input/Switch';
import Autocomplete from './components/input/Autocomplete';
import InputBase from './components/input/InputBase';
import FilledInput from './components/input/FilledInput';
import InputAdornment from './components/input/InputAdornment';
import FormControlLabel from './components/input/FormControlLabel';
import FormHelperText from './components/input/FormHelperText';
import OutlinedInput from './components/input/OutlinedInput';
import TextField from './components/input/TextField';
import Select from './components/input/Select';
import Drawer from './components/navigation/Drawer';
import Menu from './components/navigation/Menu';
import Tabs from './components/navigation/Tabs';
import Tab from './components/navigation/Tab';
import Breadcrumbs from './components/navigation/Breadcrumbs';
import Stepper from './components/navigation/Stepper';
import StepLabel from './components/navigation/StepLabel';
import StepConnector from './components/navigation/StepConnector';
import Divider from './components/data-display/Divider';
import Chip from './components/data-display/Chip';
import Tooltip from './components/data-display/Tooltip';
import Avatar from './components/data-display/Avatar';
import Badge from './components/data-display/Badge';
import Alert from './components/feedback/Alert';
import Dialog from './components/feedback/Dialog';
import DialogTitle from './components/feedback/DialogTitle';
import DialogContent from './components/feedback/DialogContent';
import DialogContentText from './components/feedback/DialogContentText';
import DialogActions from './components/feedback/DialogActions';
import CircularProgress from './components/feedback/CircularProgress';
import LinearProgress from './components/feedback/LinearProgress';
import SnackbarContent from './components/feedback/SnackbarContent';
import Skeleton from './components/feedback/Skeleton';
import Link from './components/navigation/Link';
import List from './components/list/List';
import ListItemButton from './components/list/ListItemButton';
import ListItemIcon from './components/list/ListItemIcon';
import ListItemText from './components/list/ListItemText';
import MenuItem from './components/list/MenuItem';
import Collapse from './components/list/Collapse';
import DataGrid from './components/data-grid/DataGrid';
import MonthCalendar from './components/date-picker/MonthCalendar';
import YearCalendar from './components/date-picker/YearCalendar';
import PaginationItem from './components/pagination/PaginationItem';

const componentOverrides = {
  MuiStack: Stack,
  MuiPaper: Paper,
  MuiButton: Button,
  MuiButtonBase: ButtonBase,
  MuiIconButton: IconButton,
  MuiToolbar: Toolbar,
  MuiCheckbox: Checkbox,
  MuiRadio: Radio,
  MuiSwitch: Switch,
  MuiAutocomplete: Autocomplete,
  MuiFilledInput: FilledInput,
  MuiFormControlLabel: FormControlLabel,
  MuiFormHelperText: FormHelperText,
  MuiInputAdornment: InputAdornment,
  MuiInputBase: InputBase,
  MuiOutlinedInput: OutlinedInput,
  MuiTextField: TextField,
  MuiSelect: Select,
  MuiDrawer: Drawer,
  MuiMenu: Menu,
  MuiTabs: Tabs,
  MuiTab: Tab,
  MuiBreadcrumbs: Breadcrumbs,
  MuiStepper: Stepper,
  MuiStepLabel: StepLabel,
  MuiStepConnector: StepConnector,
  MuiDivider: Divider,
  MuiChip: Chip,
  MuiTooltip: Tooltip,
  MuiAvatar: Avatar,
  MuiBadge: Badge,
  MuiAlert: Alert,
  MuiDialog: Dialog,
  MuiDialogTitle: DialogTitle,
  MuiDialogContent: DialogContent,
  MuiDialogContentText: DialogContentText,
  MuiDialogActions: DialogActions,
  MuiCircularProgress: CircularProgress,
  MuiLinearProgress: LinearProgress,
  MuiSnackbarContent: SnackbarContent,
  MuiSkeleton: Skeleton,
  MuiLink: Link,
  MuiList: List,
  MuiListItemButton: ListItemButton,
  MuiListItemIcon: ListItemIcon,
  MuiListItemText: ListItemText,
  MuiMenuItem: MenuItem,
  MuiCollapse: Collapse,
  MuiDataGrid: DataGrid,
  MuiMonthCalendar: MonthCalendar,
  MuiYearCalendar: YearCalendar,
  MuiPaginationItem: PaginationItem,
  MuiCssBaseline: CssBaseline,
};

export function createAppTheme() {
  return createTheme({
    cssVariables: {
      colorSchemeSelector: 'class',
    },
    colorSchemes: {
      light: {
        palette: mapTokensToPalette(tokens.light),
      },
      dark: {
        palette: mapTokensToPalette(tokens.dark),
      },
    },
    typography,
    components: componentOverrides,
    spacing: 8,
    shape: { borderRadius: 4 },
    customShadows: [...darkCustomShadows],
  });
}

export const theme = createAppTheme();
