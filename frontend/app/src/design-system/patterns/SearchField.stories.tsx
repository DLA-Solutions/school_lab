import { useState } from 'react';
import { SearchField } from 'design-system';

export const Default = () => {
  const [value, setValue] = useState('');
  return <SearchField value={value} onChange={(e) => setValue(e.target.value)} />;
};

export const FullWidth = () => {
  const [value, setValue] = useState('');
  return <SearchField value={value} onChange={(e) => setValue(e.target.value)} fullWidth />;
};
