import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { ChargeStatus } from '../../types/charges';

interface StatusChipProps {
  status: ChargeStatus;
}

const StatusChip = ({ status }: StatusChipProps) => {
  let label: string;
  let backgroundColor: string;
  let textColor: string;

  switch (status) {
    case 'pending':
      label = 'Em aberto';
      backgroundColor = colors.warning;
      textColor = '#000';
      break;
    case 'overdue':
      label = 'Vencido';
      backgroundColor = colors.error;
      textColor = '#fff';
      break;
    case 'paid':
      label = 'Pago';
      backgroundColor = colors.success;
      textColor = '#fff';
      break;
    case 'cancelled':
      label = 'Cancelado';
      backgroundColor = colors.textDisabled;
      textColor = '#fff';
      break;
    default:
      label = status;
      backgroundColor = colors.textDisabled;
      textColor = '#fff';
  }

  return (
    <View style={[styles.chip, { backgroundColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
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
