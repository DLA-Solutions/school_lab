import { ReactNode } from 'react';
import Typography from '@mui/material/Typography';
import { DocSection } from '../components/DocLayout';
import LivePreview from '../components/LivePreview';
import PropsTable, { PropRow } from '../components/PropsTable';
import CodeBlock from '../components/CodeBlock';

export interface ComponentDocProps {
  title: string;
  description: string;
  whenToUse: string[];
  whenNotToUse: string[];
  props: PropRow[];
  code: string;
  preview: ReactNode;
  variants?: ReactNode;
}

const ComponentDocPage = ({
  title,
  description,
  whenToUse,
  whenNotToUse,
  props,
  code,
  preview,
  variants,
}: ComponentDocProps) => (
  <>
    <DocSection id={title.toLowerCase()} title={title} description={description}>
      <Typography variant="h6" gutterBottom>
        Live preview
      </Typography>
      <LivePreview>{preview}</LivePreview>

      {variants && (
        <>
          <Typography variant="h6" gutterBottom>
            Variants
          </Typography>
          <LivePreview>{variants}</LivePreview>
        </>
      )}

      <Typography variant="h6" gutterBottom>
        Props
      </Typography>
      <PropsTable rows={props} />

      <Typography variant="h6" gutterBottom>
        Usage
      </Typography>
      <CodeBlock code={code} />

      <Typography variant="h6" gutterBottom>
        Do
      </Typography>
      <ul>
        {whenToUse.map((item) => (
          <li key={item}>
            <Typography variant="body2">{item}</Typography>
          </li>
        ))}
      </ul>

      <Typography variant="h6" gutterBottom>
        Don&apos;t
      </Typography>
      <ul>
        {whenNotToUse.map((item) => (
          <li key={item}>
            <Typography variant="body2">{item}</Typography>
          </li>
        ))}
      </ul>
    </DocSection>
  </>
);

export default ComponentDocPage;
