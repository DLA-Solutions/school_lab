import { useState, SyntheticEvent } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
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

const steps = ['School data', 'Guardians', 'Billing plan'];

const NavigationSection = () => {
  const [tab, setTab] = useState(0);
  const [activeStep, setActiveStep] = useState(1);

  const handleTabChange = (_event: SyntheticEvent, value: number) => setTab(value);

  return (
    <>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Tabs — brand indicator, used for section navigation within a page.
      </Typography>
      <LivePreview>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Students" />
          <Tab label="Billing" />
        </Tabs>
      </LivePreview>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
        Breadcrumbs — muted trail with a dedicated separator color.
      </Typography>
      <LivePreview>
        <Breadcrumbs separator={<IconifyIcon icon="mdi:chevron-right" />}>
          <Link href="#" color="inherit">
            Dashboard
          </Link>
          <Link href="#" color="inherit">
            Students
          </Link>
          <Typography color="text.primary">Maria Silva</Typography>
        </Breadcrumbs>
      </LivePreview>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
        Stepper — onboarding-style flow with primary-colored active/completed connectors.
      </Typography>
      <LivePreview>
        <Stack spacing={2}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box>
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
          </Box>
        </Stack>
      </LivePreview>
    </>
  );
};

export default NavigationSection;
