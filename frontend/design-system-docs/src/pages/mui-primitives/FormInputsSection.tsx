import { useState, SyntheticEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Checkbox from '@mui/material/Checkbox';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Autocomplete from '@mui/material/Autocomplete';
import LivePreview from '../../components/LivePreview';

const schools = ['Colégio Aurora', 'Escola Vale Verde', 'Instituto Nova Era'];

const FormInputsSection = () => {
  const [status, setStatus] = useState('pending');
  const [plan, setPlan] = useState('monthly');

  const handlePlanChange = (_event: SyntheticEvent, value: string) => setPlan(value);

  return (
    <Stack direction="column" spacing={3}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          TextField, Select, and Checkbox
        </Typography>
        <LivePreview>
          <Stack direction="column" spacing={2} sx={{ maxWidth: 360, width: '100%' }}>
            <TextField variant="filled" placeholder="Filled input" size="small" fullWidth />
            <TextField
              variant="filled"
              placeholder="Invalid input"
              size="small"
              fullWidth
              error
              helperText="This field is required"
            />
            <FormControl variant="filled" size="small" fullWidth>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="canceled">Canceled</MenuItem>
              </Select>
              <FormHelperText>Order status</FormHelperText>
            </FormControl>
            <FormControlLabel
              control={<Checkbox defaultChecked color="primary" />}
              label="Remember me"
            />
          </Stack>
        </LivePreview>
      </Box>

      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Switch and Radio
        </Typography>
        <LivePreview>
          <Stack direction="column" spacing={2} sx={{ maxWidth: 360, width: '100%' }}>
            <FormControlLabel control={<Switch defaultChecked />} label="Enable notifications" />
            <FormControlLabel control={<Switch />} label="Weekly digest e-mail" />
            <RadioGroup
              row
              value={plan}
              onChange={handlePlanChange}
              sx={{ flexWrap: 'wrap', columnGap: 2 }}
            >
              <FormControlLabel value="monthly" control={<Radio />} label="Monthly" />
              <FormControlLabel value="yearly" control={<Radio />} label="Yearly" />
            </RadioGroup>
          </Stack>
        </LivePreview>
      </Box>

      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Autocomplete
        </Typography>
        <LivePreview>
          <Autocomplete
            options={schools}
            sx={{ maxWidth: 360, width: '100%' }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="filled"
                size="small"
                placeholder="Search schools"
              />
            )}
          />
        </LivePreview>
      </Box>
    </Stack>
  );
};

export default FormInputsSection;
