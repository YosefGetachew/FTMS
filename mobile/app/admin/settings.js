import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Field, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API, { getApiErrorMessage } from '../../src/services/api';
import { colors } from '../../src/styles/theme';
import { canManageUsers } from '../../src/utils/access';
import { formatStage } from '../../src/utils/format';

const workflowTypes = [
  'sector_structure',
  'ceo_structure',
  'office_head_structure',
  'minister_structure',
];

export default function SettingsScreen() {
  const { user } = useAuth();
  const [sectors, setSectors] = useState([]);
  const [offices, setOffices] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sectorForm, setSectorForm] = useState({ name: '', workflowType: 'sector_structure' });
  const [officeForm, setOfficeForm] = useState({ sectorId: '', name: '' });
  const [affiliateForm, setAffiliateForm] = useState({
    organizationName: '',
    generalDirectorName: '',
    email: '',
    phone: '',
  });

  const load = useCallback(async () => {
    if (!canManageUsers(user?.role)) return;

    try {
      setLoading(true);
      setError('');
      const [sectorResponse, officeResponse, affiliateResponse] = await Promise.all([
        API.get('/moa-sectors'),
        API.get('/moa-executive-offices'),
        API.get('/affiliate-institutions'),
      ]);
      setSectors(sectorResponse.data || []);
      setOffices(officeResponse.data || []);
      setAffiliates(affiliateResponse.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load organization settings.'));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const sectorOptions = useMemo(
    () => sectors.map((item) => ({ label: item.name, value: String(item.id) })),
    [sectors]
  );

  const addSector = async () => {
    try {
      await API.post('/moa-sectors', sectorForm);
      setSectorForm({ name: '', workflowType: 'sector_structure' });
      await load();
    } catch (err) {
      Alert.alert('Save failed', getApiErrorMessage(err, 'Could not add Sector / Office.'));
    }
  };

  const addOffice = async () => {
    try {
      await API.post('/moa-executive-offices', officeForm);
      setOfficeForm({ sectorId: '', name: '' });
      await load();
    } catch (err) {
      Alert.alert('Save failed', getApiErrorMessage(err, 'Could not add Executive Office.'));
    }
  };

  const addAffiliate = async () => {
    try {
      await API.post('/affiliate-institutions', affiliateForm);
      setAffiliateForm({ organizationName: '', generalDirectorName: '', email: '', phone: '' });
      await load();
    } catch (err) {
      Alert.alert('Save failed', getApiErrorMessage(err, 'Could not add Affiliate Institution.'));
    }
  };

  const deleteItem = (title, path) => {
    Alert.alert('Delete item', `Delete ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(path);
            await load();
          } catch (err) {
            Alert.alert('Delete failed', getApiErrorMessage(err, 'Could not delete item.'));
          }
        },
      },
    ]);
  };

  if (!canManageUsers(user?.role)) {
    return <EmptyState title="Access restricted" message="Only Admin and Super Admin can manage organization settings." />;
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>System Governance</Text>
        <Text style={styles.title}>Organization Settings</Text>
        <Text style={styles.subtitle}>Maintain MoA structures, executive offices, and affiliate institutions.</Text>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}

      <Section title="MoA Sector / Office">
        <Field label="Name" value={sectorForm.name} onChangeText={(value) => setSectorForm((current) => ({ ...current, name: value }))} />
        <ChoiceRow
          label="Workflow Type"
          value={sectorForm.workflowType}
          options={workflowTypes.map((value) => ({ label: formatStage(value), value }))}
          onChange={(value) => setSectorForm((current) => ({ ...current, workflowType: value }))}
        />
        <Button onPress={addSector}>Add Sector / Office</Button>
        <List
          items={sectors}
          title={(item) => item.name}
          subtitle={(item) => formatStage(item.workflow_type)}
          onDelete={(item) => deleteItem(item.name, `/moa-sectors/${item.id}`)}
        />
      </Section>

      <Section title="Executive Offices">
        <ChoiceRow
          label="Sector / Office"
          value={officeForm.sectorId}
          options={sectorOptions}
          onChange={(value) => setOfficeForm((current) => ({ ...current, sectorId: value }))}
        />
        <Field label="Executive Office Name" value={officeForm.name} onChangeText={(value) => setOfficeForm((current) => ({ ...current, name: value }))} />
        <Button onPress={addOffice}>Add Executive Office</Button>
        <List
          items={offices}
          title={(item) => item.name}
          subtitle={(item) => item.sector_name}
          onDelete={(item) => deleteItem(item.name, `/moa-executive-offices/${item.id}`)}
        />
      </Section>

      <Section title="Affiliate Institutions">
        <Field label="Organization Name" value={affiliateForm.organizationName} onChangeText={(value) => setAffiliateForm((current) => ({ ...current, organizationName: value }))} />
        <Field label="General Director" value={affiliateForm.generalDirectorName} onChangeText={(value) => setAffiliateForm((current) => ({ ...current, generalDirectorName: value }))} />
        <Field label="Email" value={affiliateForm.email} onChangeText={(value) => setAffiliateForm((current) => ({ ...current, email: value }))} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Phone" value={affiliateForm.phone} onChangeText={(value) => setAffiliateForm((current) => ({ ...current, phone: value }))} keyboardType="phone-pad" />
        <Button onPress={addAffiliate}>Add Affiliate</Button>
        <List
          items={affiliates}
          title={(item) => item.organization_name}
          subtitle={(item) => item.email || item.phone || 'Affiliate Institution'}
          onDelete={(item) => deleteItem(item.organization_name, `/affiliate-institutions/${item.id}`)}
        />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

function ChoiceRow({ label, value, options, onChange }) {
  return (
    <View style={styles.choiceBlock}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'primary' : 'secondary'}
            style={styles.choiceButton}
            onPress={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </View>
    </View>
  );
}

function List({ items, title, subtitle, onDelete }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{title(item)}</Text>
            <Text style={styles.rowMeta}>{subtitle(item) || '-'}</Text>
          </View>
          <Button variant="danger" style={styles.deleteButton} onPress={() => onDelete(item)}>Delete</Button>
        </View>
      ))}
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
  section: { marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  choiceBlock: { gap: 8, marginBottom: 14 },
  choiceLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceButton: { minHeight: 38, paddingHorizontal: 10 },
  list: { marginTop: 12 },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  rowTitle: { color: colors.text, fontWeight: '900' },
  rowMeta: { color: colors.muted, marginTop: 2 },
  deleteButton: { minHeight: 36, paddingHorizontal: 10 },
});
