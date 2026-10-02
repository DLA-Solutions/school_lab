import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../theme/colors';
import { Charge, ChargeHistoryItem } from '../../types/charges';
import { formatCurrencyBRL, formatDateBR } from '../../utils/format';
import StatusChip from './StatusChip';

type ChargeItem = Charge | ChargeHistoryItem;

interface ChargeListItemProps {
  charge: ChargeItem;
}

const ChargeListItem = ({ charge }: ChargeListItemProps) => {
  const studentName = charge.student?.name ?? 'Sem aluno';
  const hasBoleto = 'payment_methods' in charge && charge.payment_methods?.boleto_url;
  const dateLabel = 'due_date' in charge ? formatDateBR(charge.due_date) : formatDateBR(charge.paid_at);

  const handleOpenBoleto = async () => {
    if (!hasBoleto) return;
    const boleto_url = 'payment_methods' in charge ? charge.payment_methods.boleto_url : null;
    if (boleto_url) {
      try {
        await WebBrowser.openBrowserAsync(boleto_url);
      } catch (error) {
        console.error('Failed to open boleto URL:', error);
      }
    }
  };

  const content = (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.studentName}>{studentName}</Text>
          <Text style={styles.billingPeriod}>{charge.billing_period}</Text>
        </View>
        <StatusChip status={charge.status} />
      </View>

      <View style={styles.details}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.amount}>{formatCurrencyBRL(charge.total_amount_cents)}</Text>
      </View>

      {!hasBoleto && (
        <Text style={styles.unavailableText}>Boleto indisponível</Text>
      )}
    </View>
  );

  if (!hasBoleto) {
    return <View style={styles.itemContainer}>{content}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.itemContainer, pressed && styles.pressed]}
      onPress={handleOpenBoleto}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  container: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  billingPeriod: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  unavailableText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default ChargeListItem;
