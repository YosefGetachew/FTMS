import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import RequestCard from '../../src/components/RequestCard';
import { Button, EmptyState, Field, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useRequests } from '../../src/context/RequestsContext';
import API, { getApiErrorMessage } from '../../src/services/api';
import { colors } from '../../src/styles/theme';
import { canCreateRequest } from '../../src/utils/access';
import { normalizeText } from '../../src/utils/format';
import { canDecideRequest, getNegativeAction, getPrimaryAction } from '../../src/utils/permissions';

export default function RequestsScreen() {
  const { user } = useAuth();
  const { requests, loading, error, refresh } = useRequests();
  const showNewRequest = canCreateRequest(user?.role);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const filtered = useMemo(() => {
    const keyword = normalizeText(search);
    if (!keyword) return requests;

    return requests.filter((request) =>
      [
        request.full_name,
        request.country,
        request.sector,
        request.department,
        request.organization_name,
        request.status,
        request.final_status,
        request.current_stage,
      ].join(' ').toLowerCase().includes(keyword)
    );
  }, [requests, search]);

  const updateStatus = async (request, action, comment = '') => {
    try {
      setUpdatingId(request.id);
      await API.put(`/requests/${request.id}/status`, {
        action,
        role: user.role,
        actorEmail: user.email,
        actorId: user.id || null,
        comment,
      });
      await refresh();
    } catch (err) {
      Alert.alert('Update failed', getApiErrorMessage(err, 'Could not update request.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmReject = (request) => {
    const negative = getNegativeAction(request);

    Alert.alert(negative.label, 'Apply this decision to the selected request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: negative.label,
        style: 'destructive',
        onPress: () =>
          updateStatus(
            request,
            negative.action,
            `${negative.label} from FTMS mobile.`
          ),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Requests</Text>
        {showNewRequest ? (
          <Link href="/request/new" asChild>
            <Button style={styles.newButton}>New</Button>
          </Link>
        ) : null}
      </View>

      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Traveler, country, status..." />
      {error ? <Notice type="error">{error}</Notice> : null}

      {filtered.length === 0 ? (
        <EmptyState title="No requests found" message="Pull to refresh or adjust your search." />
      ) : (
        filtered.map((request) => {
          const primary = getPrimaryAction(request);
          const negative = getNegativeAction(request);
          const canDecide = canDecideRequest(user, request);

          return (
            <RequestCard
              key={request.id}
              request={request}
              footer={
                canDecide ? (
                  <View style={styles.cardActions}>
                    <Button
                      style={styles.smallButton}
                      loading={updatingId === request.id}
                      onPress={() => updateStatus(request, primary.action)}
                    >
                      {primary.label}
                    </Button>
                    {negative ? (
                      <Button variant="danger" style={styles.smallButton} onPress={() => confirmReject(request)}>
                        {negative.label}
                      </Button>
                    ) : null}
                  </View>
                ) : null
              }
            />
          );
        })
      )}
    </ScrollView>
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  newButton: {
    minHeight: 42,
    minWidth: 86,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    minHeight: 38,
    paddingHorizontal: 10,
  },
});
