import { StyleSheet, Text, View } from 'react-native';
import { t, type MessageKey } from '../../i18n';
import { colors } from '../../theme/colors';
import { ChargeStatus } from '../../types/charges';

interface StatusChipProps {
  status: ChargeStatus;
}

const STATUS_LABELS: Record<ChargeStatus, MessageKey> = {
  pending: 'boletos.status.pending',
  overdue: 'boletos.status.overdue',
  paid: 'boletos.status.paid',
  cancelled: 'boletos.status.cancelled',
};

const STATUS_COLORS: Record<ChargeStatus, { backgroundColor: string; textColor: string }> = {
  pending: { backgroundColor: colors.warning, textColor: '#000' },
  overdue: { backgroundColor: colors.error, textColor: '#fff' },
  paid: { backgroundColor: colors.success, textColor: '#fff' },
  cancelled: { backgroundColor: colors.textDisabled, textColor: '#fff' },
};

const StatusChip = ({ status }: StatusChipProps) => {
  const labelKey = STATUS_LABELS[status];
  const palette = STATUS_COLORS[status];
  if (!labelKey || !palette) {
    return null;
  }

  return (
    <View style={[styles.chip, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.label, { color: palette.textColor }]}>{t(labelKey)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusChip;
