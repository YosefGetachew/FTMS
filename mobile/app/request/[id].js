import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState } from '../../src/components/ui';
import { useRequests } from '../../src/context/RequestsContext';
import { apiOrigin } from '../../src/services/api';
import { colors } from '../../src/styles/theme';
import { formatDate, formatStage, getTripDays } from '../../src/utils/format';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const { requests } = useRequests();

  const request = useMemo(
    () => requests.find((item) => String(item.id) === String(id)),
    [id, requests]
  );

  if (!request) {
    return <EmptyState title="Request not loaded" message="Go back and refresh the request list." />;
  }

  const openPdf = () => Linking.openURL(`${apiOrigin}/api/generate-pdf/${request.id}`);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.name}>{request.full_name || 'Traveler'}</Text>
        <Text style={styles.meta}>{request.position || '-'} · {request.organization_name || 'MoA'}</Text>
        <Text style={styles.stage}>{formatStage(request.current_stage)}</Text>
      </Card>

      <Card style={styles.card}>
        <Info label="Destination" value={request.country} />
        <Info label="Travel Date" value={`${formatDate(request.start_date)} to ${formatDate(request.end_date)}`} />
        <Info label="Days" value={`${getTripDays(request.start_date, request.end_date)} days`} />
        <Info label="Structure" value={request.sector} />
        <Info label="Lead Executive Office" value={request.department} />
        <Info label="Final Status" value={request.final_status} />
        <Info label="Status" value={request.status} />
        <Info label="Sponsor" value={request.sponsor} />
        <Info label="Passport Number" value={request.passport_number} />
        <Info label="Comment" value={request.amendment_comment || request.decision_comment || request.foreign_affairs_comment} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Purpose</Text>
        <Text style={styles.paragraph}>{request.purpose || '-'}</Text>
      </Card>

      <Button onPress={openPdf}>Open PDF</Button>
    </ScrollView>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { padding: 16 },
  card: { marginBottom: 12 },
  name: { color: colors.text, fontSize: 22, fontWeight: '900' },
  meta: { color: colors.muted, marginTop: 3 },
  stage: { color: colors.primary, fontSize: 16, fontWeight: '900', marginTop: 12 },
  info: { borderTopColor: colors.border, borderTopWidth: 1, paddingVertical: 11 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  value: { color: colors.text, fontSize: 15, fontWeight: '800', lineHeight: 21, marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 },
  paragraph: { color: colors.muted, lineHeight: 21 },
});
