import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useRequests } from '../../src/context/RequestsContext';
import { colors } from '../../src/styles/theme';

const ministerActions = [
  {
    title: 'Review Requests',
    detail: 'Approve, reject, or send to protocol',
    icon: 'checkmark-done-outline',
    href: '/requests',
    tint: '#0b5f3a',
    background: '#eaf7ef',
  },
  {
    title: 'Reports',
    detail: 'Open ministry travel analytics',
    icon: 'analytics-outline',
    href: '/reports',
    tint: '#5b2db7',
    background: '#f0eaff',
  },
  {
    title: 'Travel Status',
    detail: 'Follow request progress',
    icon: 'git-branch-outline',
    href: '/status',
    tint: '#a46100',
    background: '#fff4df',
  },
  {
    title: 'Profile',
    detail: 'Account and sign out',
    icon: 'person-circle-outline',
    href: '/profile',
    tint: '#295a8f',
    background: '#eaf3ff',
  },
];

export default function DashboardScreen() {
  const { user } = useAuth();
  const { requests, loading, error, summary, refresh } = useRequests();
  const isTraveler = ['traveler', 'expert'].includes(user?.role);
  const canViewReports = ['admin', 'super_admin', 'minister', 'office_head'].includes(user?.role);
  const isMinister = user?.role === 'minister';
  const ministerDecisionCount = isMinister
    ? requests.filter((item) => item.current_stage === 'minister_review' && item.final_status === 'pending').length
    : 0;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Foreign Travel Management</Text>
        <Text style={styles.title}>Hello, {user?.full_name || 'FTMS User'}</Text>
        <Text style={styles.subtitle}>{user?.role || 'role'} | {user?.department || user?.sector || 'Ministry of Agriculture'}</Text>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}

      {ministerDecisionCount > 0 ? (
        <Link href="/requests" asChild>
          <Pressable style={({ pressed }) => [styles.decisionNotice, pressed && styles.noticePressed]}>
            <View style={styles.decisionIcon}>
              <Ionicons name="alert-circle-outline" size={26} color="#b42318" />
            </View>
            <View style={styles.decisionText}>
              <Text style={styles.decisionTitle}>Minister decision needed</Text>
              <Text style={styles.decisionMessage}>
                {ministerDecisionCount} travel request{ministerDecisionCount === 1 ? '' : 's'} waiting for your decision.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#b42318" />
          </Pressable>
        </Link>
      ) : null}

      <View style={styles.grid}>
        <Metric label="Visible Requests" value={summary.total} />
        <Metric label="Pending" value={summary.pending} />
        <Metric label="Returned" value={summary.returned} />
        <Metric label="Completed" value={summary.completed} />
      </View>

      {isMinister ? (
        <View style={styles.ministerPanel}>
          <View style={styles.ministerPanelHeader}>
            <Text style={styles.actionTitle}>Minister actions</Text>
            <Text style={styles.actionText}>Fast access to decisions, reports, and request progress.</Text>
          </View>
          <View style={styles.tileGrid}>
            {ministerActions.map((item) => (
              <Link key={item.title} href={item.href} asChild>
                <ActionTile
                  item={item}
                  badge={item.href === '/requests' && ministerDecisionCount > 0 ? ministerDecisionCount : 0}
                />
              </Link>
            ))}
          </View>
        </View>
      ) : isTraveler ? (
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

function ActionTile({ item, badge = 0, ...props }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.tile,
        pressed && styles.tilePressed,
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: item.background }]}>
        <Ionicons name={item.icon} size={30} color={item.tint} />
        {badge ? (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.tileTitle}>{item.title}</Text>
      <Text style={styles.tileDetail}>{item.detail}</Text>
    </Pressable>
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
  decisionNotice: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderColor: '#fecdca',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    padding: 14,
  },
  noticePressed: {
    opacity: 0.76,
  },
  decisionIcon: {
    alignItems: 'center',
    backgroundColor: '#ffe3df',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  decisionText: {
    flex: 1,
  },
  decisionTitle: {
    color: '#7a271a',
    fontSize: 15,
    fontWeight: '900',
  },
  decisionMessage: {
    color: '#9f3a2f',
    lineHeight: 18,
    marginTop: 3,
  },
  actionCard: {
    marginTop: 16,
  },
  ministerPanel: {
    marginTop: 16,
  },
  ministerPanelHeader: {
    marginBottom: 10,
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
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 132,
    paddingHorizontal: 10,
    paddingVertical: 16,
    shadowColor: '#10291e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: '48%',
  },
  tilePressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  tileIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    marginBottom: 12,
    width: 56,
  },
  tileBadge: {
    alignItems: 'center',
    backgroundColor: '#d92d20',
    borderColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    minWidth: 22,
    paddingHorizontal: 5,
    position: 'absolute',
    right: -6,
    top: -6,
  },
  tileBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  tileTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  tileDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    textAlign: 'center',
  },
});
