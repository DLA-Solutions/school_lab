import { useState, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { SearchField, SectionCard } from 'design-system';
import OrdersStatusTable from './OrdersStatusTable';

const OrdersStatus = () => {
  const [searchText, setSearchText] = useState('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  return (
    <SectionCard
      padding={0}
      title="Orders Status"
      headerActions={
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
    >
      <Stack
        px={3.5}
        pb={2}
        width={1}
        justifyContent="center"
        sx={{ display: { xs: 'flex', sm: 'none' } }}
      >
        <SearchField
          value={searchText}
          onChange={handleInputChange}
          ariaLabel="Search orders"
          fullWidth
        />
      </Stack>

      <Box px={3.5} pb={3.5} sx={{ height: 594, width: 1, flexShrink: 0 }}>
        <OrdersStatusTable searchText={searchText} />
      </Box>
    </SectionCard>
  );
};

export default OrdersStatus;
