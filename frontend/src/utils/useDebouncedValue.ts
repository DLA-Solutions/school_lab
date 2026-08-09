import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay`, so a listing refetches once the user stops typing rather than on
 * every keystroke.
 */
export const useDebouncedValue = <T>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
