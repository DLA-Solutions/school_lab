import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { t } from '../i18n';
import { MessagesStackParamList } from '../navigation/types';
import { useGuardianContext } from '../providers/GuardianContext';
import { colors } from '../theme/colors';
import { displayPublishedAt } from '../utils/format';

type Props = NativeStackScreenProps<MessagesStackParamList, 'AnnouncementDetail'>;

const AnnouncementDetailScreen = ({ route }: Props) => {
  const { id, schoolId, title, body, publishedAt } = route.params;
  const { activeSchoolId } = useGuardianContext();
  const idIsSafe = typeof id === 'number' && Number.isSafeInteger(id) && id > 0;
  const schoolMatches = activeSchoolId != null && schoolId === activeSchoolId;
  const published = typeof publishedAt === 'string' ? displayPublishedAt(publishedAt) : '';

  if (!idIsSafe || !schoolMatches) {
    return (
      <View style={styles.status}>
        <Text style={styles.statusText}>{t('announcements.unavailable')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {title.trim().length > 0 ? <Text style={styles.title}>{title}</Text> : null}
      {published.length > 0 ? <Text style={styles.date}>{published}</Text> : null}
      {body.trim().length > 0 ? <Text style={styles.body}>{body}</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  status: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  date: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  body: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
});

export default AnnouncementDetailScreen;
