import Typography from '@mui/material/Typography';
import { DocSection } from '../components/DocLayout';
import CodeBlock from '../components/CodeBlock';

const PagePatterns = () => (
  <DocSection
    id="page-patterns"
    title="Page patterns"
    description="Compose patterns for common product screens."
  >
    <Typography variant="h6" gutterBottom>
      List page
    </Typography>
    <CodeBlock
      code={`PageHeader + SearchField + SectionCard + DataTable + EmptyState

Reference: OrdersStatus section (dashboard template).`}
    />
    <Typography variant="h6" gutterBottom>
      Form page
    </Typography>
    <CodeBlock code="SectionCard + MUI fields + ErrorBanner + action buttons" />
    <Typography variant="h6" gutterBottom>
      Detail page
    </Typography>
    <CodeBlock code="PageHeader + SectionCard grid" />
  </DocSection>
);

export default PagePatterns;
