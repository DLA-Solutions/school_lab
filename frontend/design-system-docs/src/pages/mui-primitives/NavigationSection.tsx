import { useState, SyntheticEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import IconifyIcon from 'components/base/IconifyIcon';
import LivePreview from '../../components/LivePreview';

const steps = ['School data', 'Guardians', 'Billing'];

const NavigationSection = () => {
  const [tab, setTab] = useState(0);
  const [activeStep, setActiveStep] = useState(1);

  const handleTabChange = (_event: SyntheticEvent, value: number) => setTab(value);

  return (
    <Stack direction="column" spacing={3}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Tabs
        </Typography>
        <LivePreview>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ maxWidth: '100%' }}
          >
            <Tab label="Overview" />
            <Tab label="Students" />
            <Tab label="Billing" />
          </Tabs>
        </LivePreview>
      </Box>

      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Breadcrumbs
        </Typography>
        <LivePreview>
          <Breadcrumbs
            separator={<IconifyIcon icon="mdi:chevron-right" width={16} height={16} />}
            sx={{
              '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap', rowGap: 0.5 },
            }}
          >
            <Link href="#" color="inherit" underline="hover">
              Dashboard
            </Link>
            <Link href="#" color="inherit" underline="hover">
              Students
            </Link>
            <Typography color="text.primary">Maria Silva</Typography>
          </Breadcrumbs>
        </LivePreview>
      </Box>

      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Stepper
        </Typography>
        <LivePreview>
          <Stack direction="column" spacing={2}>
            <Box sx={{ width: '100%', overflowX: 'auto', pb: 0.5 }}>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap>
              <Button
                size="small"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((step) => step - 1)}
              >
                Back
              </Button>
              <Button
                size="small"
                disabled={activeStep === steps.length - 1}
                onClick={() => setActiveStep((step) => step + 1)}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </LivePreview>
      </Box>
    </Stack>
  );
};

export default NavigationSection;
