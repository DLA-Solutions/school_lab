import { HashRouter, Navigate, Route, Routes } from 'react-router';
import DocLayout from './components/DocLayout';
import Introduction from './pages/Introduction';
import Tokens from './pages/Tokens';
import TypographyPage from './pages/Typography';
import SpacingShadows from './pages/SpacingShadows';
import Theming from './pages/Theming';
import PagePatterns from './pages/PagePatterns';
import ComponentsIndex from './pages/ComponentsIndex';
import Breakpoints from './pages/layout/Breakpoints';
import Containers from './pages/layout/Containers';
import GridPage from './pages/layout/GridPage';
import ZIndex from './pages/layout/ZIndex';
import Reboot from './pages/content/Reboot';
import Images from './pages/content/Images';
import Tables from './pages/content/Tables';
import FormsOverview from './pages/forms/Overview';
import FormControls from './pages/forms/Controls';
import FormSelection from './pages/forms/Selection';
import FormLayout from './pages/forms/FormLayout';
import FormValidation from './pages/forms/Validation';
import SxConventions from './pages/utilities/SxConventions';
import StackPage from './pages/utilities/StackPage';
import Truncation from './pages/utilities/Truncation';
import VisuallyHidden from './pages/utilities/VisuallyHidden';
import AspectRatio from './pages/utilities/AspectRatio';
import ButtonsPage from './pages/primitives/ButtonsPage';
import FormInputsPage from './pages/primitives/FormInputsPage';
import SurfacesPage from './pages/primitives/SurfacesPage';
import OverlaysPage from './pages/primitives/OverlaysPage';
import DataDisplayPage from './pages/primitives/DataDisplayPage';
import NavigationPage from './pages/primitives/NavigationPage';
import SnackbarPage from './pages/primitives/SnackbarPage';
import PopoverPage from './pages/primitives/PopoverPage';
import BackdropPage from './pages/primitives/BackdropPage';
import PaginationPage from './pages/primitives/PaginationPage';
import PageHeaderDoc from './pages/components/PageHeaderDoc';
import SectionCardDoc from './pages/components/SectionCardDoc';
import SearchFieldDoc from './pages/components/SearchFieldDoc';
import SemanticChipDoc from './pages/components/SemanticChipDoc';
import EmptyStateDoc from './pages/components/EmptyStateDoc';
import ErrorBannerDoc from './pages/components/ErrorBannerDoc';
import ConfirmDialogDoc from './pages/components/ConfirmDialogDoc';
import DataTableDoc from './pages/components/DataTableDoc';
import ThemeToggleDoc from './pages/components/ThemeToggleDoc';
import UseChartThemeDoc from './pages/components/UseChartThemeDoc';

const App = () => (
  <HashRouter>
    <Routes>
      <Route element={<DocLayout />}>
        <Route index element={<Introduction />} />
        <Route path="tokens" element={<Tokens />} />
        <Route path="typography" element={<TypographyPage />} />
        <Route path="spacing-shadows" element={<SpacingShadows />} />
        <Route path="theming" element={<Theming />} />
        <Route path="layout/breakpoints" element={<Breakpoints />} />
        <Route path="layout/containers" element={<Containers />} />
        <Route path="layout/grid" element={<GridPage />} />
        <Route path="layout/z-index" element={<ZIndex />} />
        <Route path="content/reboot" element={<Reboot />} />
        <Route path="content/images" element={<Images />} />
        <Route path="content/tables" element={<Tables />} />
        <Route path="forms" element={<FormsOverview />} />
        <Route path="forms/controls" element={<FormControls />} />
        <Route path="forms/selection" element={<FormSelection />} />
        <Route path="forms/layout" element={<FormLayout />} />
        <Route path="forms/validation" element={<FormValidation />} />
        <Route path="utilities/sx" element={<SxConventions />} />
        <Route path="utilities/stack" element={<StackPage />} />
        <Route path="utilities/truncation" element={<Truncation />} />
        <Route path="utilities/visually-hidden" element={<VisuallyHidden />} />
        <Route path="utilities/ratio" element={<AspectRatio />} />
        <Route path="primitives/buttons" element={<ButtonsPage />} />
        <Route path="primitives/form-inputs" element={<FormInputsPage />} />
        <Route path="primitives/surfaces" element={<SurfacesPage />} />
        <Route path="primitives/overlays" element={<OverlaysPage />} />
        <Route path="primitives/data-display" element={<DataDisplayPage />} />
        <Route path="primitives/navigation" element={<NavigationPage />} />
        <Route path="primitives/snackbar" element={<SnackbarPage />} />
        <Route path="primitives/popover" element={<PopoverPage />} />
        <Route path="primitives/backdrop" element={<BackdropPage />} />
        <Route path="primitives/pagination" element={<PaginationPage />} />
        <Route path="page-patterns" element={<PagePatterns />} />
        <Route path="mui-primitives" element={<Navigate to="/primitives/buttons" replace />} />
        <Route path="components" element={<ComponentsIndex />} />
        <Route path="components/page-header" element={<PageHeaderDoc />} />
        <Route path="components/section-card" element={<SectionCardDoc />} />
        <Route path="components/search-field" element={<SearchFieldDoc />} />
        <Route path="components/semantic-chip" element={<SemanticChipDoc />} />
        <Route path="components/empty-state" element={<EmptyStateDoc />} />
        <Route path="components/error-banner" element={<ErrorBannerDoc />} />
        <Route path="components/confirm-dialog" element={<ConfirmDialogDoc />} />
        <Route path="components/data-table" element={<DataTableDoc />} />
        <Route path="components/theme-toggle" element={<ThemeToggleDoc />} />
        <Route path="components/use-chart-theme" element={<UseChartThemeDoc />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </HashRouter>
);

export default App;
