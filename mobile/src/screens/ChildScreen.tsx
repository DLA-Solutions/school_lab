import { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import DocumentsSection from './child/DocumentsSection';
import PreceptorshipSection from './child/PreceptorshipSection';
import RoutineHistorySection from './child/RoutineHistorySection';
import { ChildSectionHandle } from './child/useChildSection';
import ReportCardsScreen from './ReportCardsScreen';

const ChildScreen = () => {
  const routineRef = useRef<ChildSectionHandle>(null);
  const reportCardsRef = useRef<ChildSectionHandle>(null);
  const preceptorshipRef = useRef<ChildSectionHandle>(null);
  const documentsRef = useRef<ChildSectionHandle>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const onRefresh = () => {
    setRefreshing(true);
    void Promise.all([
      routineRef.current?.reload('refresh') ?? Promise.resolve(),
      reportCardsRef.current?.reload('refresh') ?? Promise.resolve(),
      preceptorshipRef.current?.reload('refresh') ?? Promise.resolve(),
      documentsRef.current?.reload('refresh') ?? Promise.resolve(),
    ]).finally(() => {
      if (mounted.current) {
        setRefreshing(false);
      }
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <RoutineHistorySection ref={routineRef} />
      <ReportCardsScreen ref={reportCardsRef} />
      <PreceptorshipSection ref={preceptorshipRef} />
      <DocumentsSection ref={documentsRef} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 32,
  },
});

export default ChildScreen;
