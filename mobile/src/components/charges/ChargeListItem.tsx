import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Charge } from '../../types/charges';
import { formatCalendarDateBR, formatCurrencyBRL } from '../../utils/format';
import StatusChip from './StatusChip';

interface ChargeListItemProps {
  charge: Charge;
  onPress: (chargeId: number) => void;
}

const ChargeListItem = ({ charge, onPress }: ChargeListItemProps) => {
  const studentName =
    typeof charge.student?.name === 'string' && charge.student.name.length > 0 ? charge.student.name : null;
  const amount =
    typeof charge.total_amount_cents === 'number' && Number.isFinite(charge.total_amount_cents)
      ? formatCurrencyBRL(charge.total_amount_cents)
      : null;
  const dueDate = typeof charge.due_date === 'string' ? formatCalendarDateBR(charge.due_date) : '';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(charge.id)}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      {studentName ? <Text style={styles.student}>{studentName}</Text> : null}
      <View style={styles.row}>
        {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        <StatusChip status={charge.status} />
      </View>
      {dueDate ? <Text style={styles.date}>{dueDate}</Text> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  item: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  student: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});

export default ChargeListItem;
