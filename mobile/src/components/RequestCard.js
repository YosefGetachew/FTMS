import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/theme';
import { formatDate, formatStage, getTripDays } from '../utils/format';
import { Card } from './ui';

export default function RequestCard({ request, footer }) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{request.full_name || 'Traveler'}</Text>
          <Text style={styles.meta}>{request.position || request.organization_name || '-'}</Text>
        </View>
        <Text style={styles.status}>{request.final_status || request.status || 'pending'}</Text>
      </View>

      <View style={styles.detailGrid}>
        <Info label="Destination" value={request.country || '-'} />
        <Info label="Days" value={String(getTripDays(request.start_date, request.end_date))} />
        <Info label="Travel Date" value={`${formatDate(request.start_date)} to ${formatDate(request.end_date)}`} wide />
        <Info label="Stage" value={formatStage(request.current_stage)} wide />
      </View>

      <Text style={styles.purpose} numberOfLines={3}>{request.purpose || '-'}</Text>

      <View style={styles.footer}>
        <Link href={`/request/${request.id}`} style={styles.link}>View details</Link>
        {footer}
      </View>
    </Card>
  );
}

function Info({ label, value, wide }) {
  return (
    <View style={[styles.info, wide && { width: '100%' }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    marginTop: 2,
  },
  status: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    height: 26,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingTop: 5,
    textTransform: 'capitalize',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  info: {
    width: '48%',
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  infoValue: {
    color: colors.text,
    fontWeight: '800',
    marginTop: 2,
  },
  purpose: {
    color: colors.muted,
    lineHeight: 19,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  link: {
    color: colors.primary,
    fontWeight: '900',
  },
});
