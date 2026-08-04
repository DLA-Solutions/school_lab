import { useState } from 'react';
import { SearchField } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const SearchFieldDoc = () => {
  const [value, setValue] = useState('');
  return (
    <ComponentDocPage
      title="SearchField"
      description="Filled TextField with search icon for list filters."
      whenToUse={['Client-side filter on list pages', 'Compact toolbar search']}
      whenNotToUse={['Global app search with API — build a dedicated component later']}
      props={[
        { name: 'value', type: 'string', required: true, description: 'Controlled value' },
        { name: 'onChange', type: 'ChangeEventHandler', required: true, description: 'Change handler' },
        { name: 'placeholder', type: 'string', description: 'Input placeholder' },
        { name: 'fullWidth', type: 'boolean', description: 'Expand to container width' },
      ]}
      code={`import { SearchField } from 'design-system';

<SearchField value={q} onChange={(e) => setQ(e.target.value)} />`}
      preview={<SearchField value={value} onChange={(e) => setValue(e.target.value)} />}
      variants={<SearchField value={value} onChange={(e) => setValue(e.target.value)} fullWidth />}
    />
  );
};

export default SearchFieldDoc;
