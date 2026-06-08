import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Field, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API, { getApiErrorMessage } from '../../src/services/api';
import { colors } from '../../src/styles/theme';
import { canManageUsers } from '../../src/utils/access';
import { formatStage, normalizeText } from '../../src/utils/format';

const roles = [
  'traveler',
  'expert',
  'lead_executive_officer',
  'state_minister',
  'chief_executive_officer',
  'office_head',
  'protocol',
  'pm_office',
  'minister',
  'admin',
];

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'traveler',
  phone: '',
  position: '',
  sector: '',
  department: '',
};

export default function UsersScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!canManageUsers(user?.role)) return;

    try {
      setLoading(true);
      setError('');
      const response = await API.get('/users');
      setItems(response.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load users.'));
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
      [item.full_name, item.email, item.role, item.sector, item.department]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, search]);

  const update = (name, value) => {
    setNotice('');
    setForm((current) => ({ ...current, [name]: value }));
  };

  const addUser = async () => {
    if (!form.fullName || !form.email || !form.password || !form.role) {
      setNotice('Full name, email, password, and role are required.');
      return;
    }

    try {
      setSaving(true);
      await API.post('/users', form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Failed to add user.'));
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (item, isActive) => {
    try {
      await API.put(`/users/${item.id}`, {
        isActive,
        accountStatus: isActive ? 'active' : 'rejected',
      });
      await load();
    } catch (err) {
      Alert.alert('Update failed', getApiErrorMessage(err, 'Could not update user.'));
    }
  };

  const deleteUser = (item) => {
    Alert.alert('Delete user', `Delete ${item.full_name || item.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(`/users/${item.id}`);
            await load();
          } catch (err) {
            Alert.alert('Delete failed', getApiErrorMessage(err, 'Could not delete user.'));
          }
        },
      },
    ]);
  };

  if (!canManageUsers(user?.role)) {
    return <EmptyState title="Access restricted" message="Only Admin and Super Admin can manage users." />;
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>People Administration</Text>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>View users, create accounts, and enable or disable access.</Text>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}
      {notice ? <Notice type="error">{notice}</Notice> : null}

      <Button variant={showForm ? 'secondary' : 'primary'} onPress={() => setShowForm((value) => !value)}>
        {showForm ? 'Hide Add User' : 'Add User'}
      </Button>

      {showForm ? (
        <Card style={styles.formCard}>
          <Field label="Full Name *" value={form.fullName} onChangeText={(value) => update('fullName', value)} />
          <Field label="Email *" value={form.email} onChangeText={(value) => update('email', value)} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Temporary Password *" value={form.password} onChangeText={(value) => update('password', value)} secureTextEntry />
          <ChoiceRow label="Role *" value={form.role} options={roles} onChange={(value) => update('role', value)} />
          <Field label="Phone" value={form.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" />
          <Field label="Position" value={form.position} onChangeText={(value) => update('position', value)} />
          <Field label="Sector / Structure" value={form.sector} onChangeText={(value) => update('sector', value)} />
          <Field label="Lead Executive Office" value={form.department} onChangeText={(value) => update('department', value)} />
          <Button loading={saving} onPress={addUser}>Create User</Button>
        </Card>
      ) : null}

      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, email, role, sector..." />

      {filtered.length === 0 ? (
        <EmptyState title="No users found" message="Pull to refresh or adjust your search." />
      ) : (
        filtered.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>{formatStage(item.role)} | {item.sector || 'Unassigned'}</Text>
            <Text style={styles.status}>{item.account_status || 'active'} | {item.is_active === false ? 'Disabled' : 'Enabled'}</Text>
            <View style={styles.actions}>
              <Button
                variant="secondary"
                style={styles.actionButton}
                onPress={() => setActive(item, item.is_active === false)}
              >
                {item.is_active === false ? 'Enable' : 'Disable'}
              </Button>
              <Button variant="danger" style={styles.actionButton} onPress={() => deleteUser(item)}>
                Delete
              </Button>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function ChoiceRow({ label, value, options, onChange }) {
  return (
    <View style={styles.choiceBlock}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => (
          <Button
            key={option}
            variant={value === option ? 'primary' : 'secondary'}
            style={styles.choiceButton}
            onPress={() => onChange(option)}
          >
            {formatStage(option)}
          </Button>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  header: { marginBottom: 16 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 4 },
  formCard: { marginBottom: 14, marginTop: 12 },
  card: { marginBottom: 12 },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, lineHeight: 20, marginTop: 3 },
  status: { color: colors.primary, fontWeight: '900', marginTop: 8, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: { flex: 1 },
  choiceBlock: { gap: 8, marginBottom: 14 },
  choiceLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceButton: { minHeight: 38, paddingHorizontal: 10 },
});
