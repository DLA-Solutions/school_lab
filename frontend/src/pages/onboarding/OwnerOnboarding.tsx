import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

/** Placeholder until #198 owner self-serve wizard ships. Guards redirect here during pending_handoff. */
const OwnerOnboarding = () => (
  <Stack gap={2} py={2}>
    <Typography variant="h4" fontWeight={600}>
      Configuração da escola
    </Typography>
    <Typography variant="body1" color="text.secondary">
      Complete a configuração inicial da escola para liberar o acesso ao sistema. O assistente de
      onboarding do proprietário será disponibilizado em breve.
    </Typography>
  </Stack>
);

export default OwnerOnboarding;
