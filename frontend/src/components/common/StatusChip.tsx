import { SemanticChip, SemanticChipVariant } from 'design-system';

interface StatusChipProps {
  status: 'delivered' | 'canceled' | 'pending';
}

const statusVariant: Record<StatusChipProps['status'], SemanticChipVariant> = {
  delivered: 'success',
  pending: 'warning',
  canceled: 'error',
};

const StatusChip = ({ status }: StatusChipProps) => {
  return <SemanticChip variant={statusVariant[status]} label={status} width={80} />;
};

export default StatusChip;
