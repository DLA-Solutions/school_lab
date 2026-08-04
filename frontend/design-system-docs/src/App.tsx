import { HashRouter, Navigate, Route, Routes } from 'react-router';
import DocLayout from './components/DocLayout';
import Introduction from './pages/Introduction';
import Tokens from './pages/Tokens';
import TypographyPage from './pages/Typography';
import SpacingShadows from './pages/SpacingShadows';
import Theming from './pages/Theming';
import PagePatterns from './pages/PagePatterns';
import MuiPrimitives from './pages/MuiPrimitives';
import ComponentsIndex from './pages/ComponentsIndex';
import PageHeaderDoc from './pages/components/PageHeaderDoc';
import SectionCardDoc from './pages/components/SectionCardDoc';
import SearchFieldDoc from './pages/components/SearchFieldDoc';
import SemanticChipDoc from './pages/components/SemanticChipDoc';
import EmptyStateDoc from './pages/components/EmptyStateDoc';
import ErrorBannerDoc from './pages/components/ErrorBannerDoc';
import ConfirmDialogDoc from './pages/components/ConfirmDialogDoc';
import DataTableDoc from './pages/components/DataTableDoc';
import ThemeToggleDoc from './pages/components/ThemeToggleDoc';

const App = () => (
  <HashRouter>
    <Routes>
      <Route element={<DocLayout />}>
        <Route index element={<Introduction />} />
        <Route path="tokens" element={<Tokens />} />
        <Route path="typography" element={<TypographyPage />} />
        <Route path="spacing-shadows" element={<SpacingShadows />} />
        <Route path="theming" element={<Theming />} />
        <Route path="page-patterns" element={<PagePatterns />} />
        <Route path="mui-primitives" element={<MuiPrimitives />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </HashRouter>
);

export default App;
