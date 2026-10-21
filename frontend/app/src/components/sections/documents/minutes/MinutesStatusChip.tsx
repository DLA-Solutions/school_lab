import { SemanticChip, SemanticChipVariant } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { MinutesStatus } from 'types/minutes';

const VARIANT: Record<MinutesStatus, SemanticChipVariant> = {
  draft: 'info',
  pending_signature: 'warning',
  signed: 'success',
  cancelled: 'error',
};

const MinutesStatusChip = ({ status }: { status: MinutesStatus }) => {
  const { t } = useTranslation();

  return <SemanticChip variant={VARIANT[status]} label={t(`minutes.status.${status}`)} />;
};

export default MinutesStatusChip;
