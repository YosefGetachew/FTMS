import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Field, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API, { getApiErrorMessage } from '../../src/services/api';
import { colors } from '../../src/styles/theme';
import { canViewAudit } from '../../src/utils/access';
import { formatDate, formatStage, normalizeText } from '../../src/utils/format';

export default function AuditScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!canViewAudit(user?.role)) return;

    try {
      setLoading(true);
      setError('');
      const response = await API.get('/audit-trail');
      setItems(response.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load audit trail.'));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = normalizeText(search);
    if (!keyword) return items;
    return items.filter((item) =>
      [
        item.request_id,
        item.full_name,
        item.country,
        item.action,
        item.actor_role,
        item.actor_email,
        item.old_stage,
        item.new_stage,
        item.comment,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, search]);

  if (!canViewAudit(user?.role)) {
    return <EmptyState title="Access restricted" message="Audit Trail is available to Admin, Super Admin, and Protocol roles." />;
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>System Accountability</Text>
        <Text style={styles.title}>Audit Trail</Text>
        <Text style={styles.subtitle}>Review recorded actions, actors, stages, and comments.</Text>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}

      <View style={styles.grid}>
        <Metric label="Records" value={items.length} />
        <Metric label="Visible" value={filtered.length} />
      </View>

      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Traveler, action, actor, stage..." />

      {filtered.length === 0 ? (
        <EmptyState title="No audit records" message="Pull to refresh or adjust your search." />
      ) : (
        filtered.map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.request}>Request #{item.request_id}</Text>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={styles.name}>{item.full_name || 'Unknown traveler'}</Text>
            <Text style={styles.meta}>{formatStage(item.action)} by {formatStage(item.actor_role)}</Text>
            <Text style={styles.meta}>{item.actor_email || '-'}</Text>
            <Text style={styles.transition}>
              {formatStage(item.old_stage)} {'->'} {formatStage(item.new_stage)}
            </Text>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          </Card>
        ))
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
  page: { backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  header: { marginBottom: 16 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metric: { flex: 1 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  metricValue: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 6 },
  card: { marginBottom: 12 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  request: { color: colors.primary, fontWeight: '900' },
  date: { color: colors.muted, fontSize: 12 },
  name: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 8 },
  meta: { color: colors.muted, lineHeight: 20, marginTop: 3 },
  transition: { color: colors.text, fontWeight: '800', marginTop: 8 },
  comment: { color: colors.muted, lineHeight: 20, marginTop: 8 },
});
