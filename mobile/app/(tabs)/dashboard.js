import { Link } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useRequests } from '../../src/hooks/useRequests';
import { colors } from '../../src/styles/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { loading, error, summary, refresh } = useRequests(user);
  const isTraveler = ['traveler', 'expert'].includes(user?.role);
  const canViewReports = ['admin', 'super_admin', 'minister', 'office_head'].includes(user?.role);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Foreign Travel Management</Text>
        <Text style={styles.title}>Hello, {user?.full_name || 'FTMS User'}</Text>
        <Text style={styles.subtitle}>{user?.role || 'role'} · {user?.department || user?.sector || 'Ministry of Agriculture'}</Text>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}

      <View style={styles.grid}>
        <Metric label="Visible Requests" value={summary.total} />
        <Metric label="Pending" value={summary.pending} />
        <Metric label="Returned" value={summary.returned} />
        <Metric label="Completed" value={summary.completed} />
      </View>

      {isTraveler ? (
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>Traveler workflow</Text>
          <Text style={styles.actionText}>Create a travel request or check where an existing request is in the approval path.</Text>
          <View style={styles.actions}>
            <Link href="/request/new" asChild>
              <Button style={styles.actionButton}>New Request</Button>
            </Link>
            <Link href="/status" asChild>
              <Button variant="secondary" style={styles.actionButton}>Track Status</Button>
            </Link>
          </View>
        </Card>
      ) : (
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>Leadership workspace</Text>
          <Text style={styles.actionText}>Review assigned travel requests and open ministry-level analytics for broader visibility.</Text>
          <View style={styles.actions}>
            <Link href="/requests" asChild>
              <Button style={styles.actionButton}>Review Requests</Button>
            </Link>
            {canViewReports ? (
              <Link href="/reports" asChild>
                <Button variant="secondary" style={styles.actionButton}>Reports</Button>
              </Link>
            ) : (
              <Link href="/status" asChild>
                <Button variant="secondary" style={styles.actionButton}>Status</Button>
              </Link>
            )}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    flexGrow: 1,
    width: '47%',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  actionCard: {
    marginTop: 16,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  actionText: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 14,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});
