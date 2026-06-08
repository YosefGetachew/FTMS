import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API, { getApiErrorMessage } from '../../src/services/api';
import { colors } from '../../src/styles/theme';
import { canManageUsers } from '../../src/utils/access';
import { formatStage } from '../../src/utils/format';

export default function PendingUsersScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!canManageUsers(user?.role)) return;

    try {
      setLoading(true);
      setError('');
      const response = await API.get('/users/pending');
      setItems(response.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load pending users.'));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item, action) => {
    try {
      setUpdatingId(item.id);
      await API.put(`/users/${item.id}/${action}`);
      await load();
    } catch (err) {
      Alert.alert('Update failed', getApiErrorMessage(err, 'Could not update user.'));
    } finally {
      setUpdatingId(null);
    }
  };

  if (!canManageUsers(user?.role)) {
    return <EmptyState title="Access restricted" message="Only Admin and Super Admin can review pending users." />;
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>People Administration</Text>
        <Text style={styles.title}>Pending Users</Text>
        <Text style={styles.subtitle}>Approve or reject account registration requests.</Text>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}

      {items.length === 0 ? (
        <EmptyState title="No pending users" message="New account requests will appear here." />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>{formatStage(item.role)} | {item.organization_name || item.sector || 'Unassigned'}</Text>
            <Text style={styles.meta}>{item.department || item.position || '-'}</Text>

            <View style={styles.actions}>
              <Button
                style={styles.actionButton}
                loading={updatingId === item.id}
                onPress={() => decide(item, 'approve')}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                style={styles.actionButton}
                disabled={updatingId === item.id}
                onPress={() => decide(item, 'reject')}
              >
                Reject
              </Button>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  header: { marginBottom: 16 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 4 },
  card: { marginBottom: 12 },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, lineHeight: 20, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: { flex: 1 },
});
