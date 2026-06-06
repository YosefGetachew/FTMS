import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API from '../../src/services/api';
import { colors } from '../../src/styles/theme';
import { formatDate } from '../../src/utils/format';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      setError('');
      const response = await API.get(`/notifications?email=${encodeURIComponent(user.email)}`);
      setItems(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    try {
      await API.put(`/notifications/read-all/${encodeURIComponent(user.email)}`);
      await load();
    } catch {
      setError('Failed to mark notifications as read.');
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        <Button variant="secondary" style={styles.readButton} onPress={markAllRead}>Read All</Button>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}

      {items.length === 0 ? (
        <EmptyState title="No alerts" message="Workflow messages and request updates will appear here." />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={[styles.item, !item.is_read && styles.unread]}>
            <Text style={styles.itemTitle}>{item.title || 'FTMS Notification'}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { padding: 16 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  readButton: { minHeight: 40, minWidth: 96 },
  item: { marginBottom: 12 },
  unread: { borderColor: colors.accent, borderWidth: 2 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  message: { color: colors.muted, lineHeight: 20, marginTop: 6 },
  date: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 10 },
});
