import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Field, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useRequests } from '../../src/hooks/useRequests';
import { colors } from '../../src/styles/theme';
import { formatDate, formatStage, normalizeText } from '../../src/utils/format';

const workflowStages = {
  sector_structure: ['expert_preparation', 'lead_executive_review', 'state_minister_review', 'protocol_clearance', 'office_head_final', 'minister_review', 'completed'],
  ceo_structure: ['expert_preparation', 'lead_executive_review', 'ceo_review', 'protocol_clearance', 'office_head_final', 'minister_review', 'completed'],
  office_head_structure: ['expert_preparation', 'lead_executive_review', 'office_head_review', 'protocol_clearance', 'office_head_final', 'minister_review', 'completed'],
};

export default function StatusScreen() {
  const { user } = useAuth();
  const { requests, loading, error, refresh } = useRequests(user);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const keyword = normalizeText(search);
    if (!keyword) return requests;
    return requests.filter((item) => [item.full_name, item.country, item.sector, item.current_stage, item.final_status].join(' ').toLowerCase().includes(keyword));
  }, [requests, search]);

  const selected = filtered[0];
  const stages = selected ? workflowStages[selected.workflow_type] || workflowStages.office_head_structure : [];
  const currentIndex = selected ? Math.max(stages.indexOf(selected.current_stage), 0) : 0;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Travel Status</Text>
      <Field label="Find Request" value={search} onChangeText={setSearch} placeholder="Traveler, destination, stage..." />
      {error ? <Notice type="error">{error}</Notice> : null}

      {!selected ? (
        <EmptyState title="No status available" message="No requests are visible for your account." />
      ) : (
        <>
          <Card style={styles.summary}>
            <Text style={styles.name}>{selected.full_name || 'Traveler'}</Text>
            <Text style={styles.meta}>{selected.country || '-'} · {formatDate(selected.start_date)} to {formatDate(selected.end_date)}</Text>
            <Text style={styles.current}>{formatStage(selected.current_stage)}</Text>
          </Card>

          <Card style={styles.timeline}>
            {stages.map((stage, index) => {
              const isComplete = index < currentIndex || selected.current_stage === 'completed';
              const isCurrent = index === currentIndex && selected.current_stage !== 'completed';
              const isRejected = selected.final_status === 'rejected' && index <= currentIndex;

              return (
                <View key={stage} style={styles.stepRow}>
                  <View style={[styles.dot, isComplete && styles.dotComplete, isCurrent && styles.dotCurrent, isRejected && styles.dotRejected]} />
                  <View style={styles.stepText}>
                    <Text style={styles.stepTitle}>{formatStage(stage)}</Text>
                    <Text style={styles.stepState}>{isRejected ? 'Rejected' : isComplete ? 'Complete' : isCurrent ? 'Current' : 'Upcoming'}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { padding: 16 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginBottom: 12 },
  summary: { marginBottom: 12 },
  name: { color: colors.text, fontSize: 19, fontWeight: '900' },
  meta: { color: colors.muted, marginTop: 4 },
  current: { color: colors.primary, fontSize: 16, fontWeight: '900', marginTop: 12 },
  timeline: { gap: 16 },
  stepRow: { flexDirection: 'row', gap: 12 },
  dot: { backgroundColor: colors.border, borderRadius: 9, height: 18, marginTop: 2, width: 18 },
  dotComplete: { backgroundColor: colors.success },
  dotCurrent: { backgroundColor: colors.accent },
  dotRejected: { backgroundColor: colors.danger },
  stepText: { flex: 1 },
  stepTitle: { color: colors.text, fontWeight: '900' },
  stepState: { color: colors.muted, marginTop: 2 },
});
