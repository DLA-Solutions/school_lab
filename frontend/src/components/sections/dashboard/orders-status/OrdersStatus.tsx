import { useState, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { PageHeader, SearchField, SectionCard } from 'design-system';
import OrdersStatusTable from './OrdersStatusTable';

const OrdersStatus = () => {
  const [searchText, setSearchText] = useState('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  return (
    <SectionCard padding={0}>
      <Stack px={3.5} pt={0}>
        <PageHeader
          title="Orders Status"
          actions={
            <>
              <SearchField
                value={searchText}
                onChange={handleInputChange}
                ariaLabel="Search orders"
                sx={{ width: 220, display: { xs: 'none', sm: 'flex' } }}
              />
              <Button variant="contained" size="small">
                Create order
              </Button>
            </>
          }
        />
      </Stack>

      <Stack my={2} px={3.5} width={1} justifyContent="center">
        <SearchField
          value={searchText}
          onChange={handleInputChange}
          ariaLabel="Search orders"
          fullWidth
          sx={{ display: { xs: 'flex', sm: 'none' } }}
        />
      </Stack>

      <Box mt={1.5} sx={{ height: 594, width: 1, flexShrink: 0 }}>
        <OrdersStatusTable searchText={searchText} />
      </Box>
    </SectionCard>
  );
};

export default OrdersStatus;
