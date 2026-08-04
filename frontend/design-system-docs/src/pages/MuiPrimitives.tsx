import Stack from '@mui/material/Stack';
import { DocSection } from '../components/DocLayout';
import ButtonsSection from './mui-primitives/ButtonsSection';
import FormInputsSection from './mui-primitives/FormInputsSection';
import SurfacesSection from './mui-primitives/SurfacesSection';
import OverlaysSection from './mui-primitives/OverlaysSection';
import DataDisplaySection from './mui-primitives/DataDisplaySection';
import NavigationSection from './mui-primitives/NavigationSection';

const MuiPrimitives = () => (
  <DocSection
    id="mui-primitives"
    title="MUI primitives"
    description="Base MUI components styled by theme overrides in frontend/main/src/theme/components/. Toggle light/dark with the theme switch above."
  >
    <Stack spacing={4}>
      <ButtonsSection />
      <FormInputsSection />
      <SurfacesSection />
      <OverlaysSection />
      <DataDisplaySection />
      <NavigationSection />
    </Stack>
  </DocSection>
);

export default MuiPrimitives;
