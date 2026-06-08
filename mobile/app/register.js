import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Notice } from '../src/components/ui';
import API, { getApiErrorMessage } from '../src/services/api';
import { colors } from '../src/styles/theme';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  position: '',
  organizationType: '',
  organizationName: '',
  sectorId: '',
  sector: '',
  department: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterScreen() {
  const [form, setForm] = useState(initialForm);
  const [moaSectors, setMoaSectors] = useState([]);
  const [offices, setOffices] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [notice, setNotice] = useState(null);

  const selectedSector = useMemo(
    () => moaSectors.find((item) => String(item.id) === String(form.sectorId)),
    [form.sectorId, moaSectors]
  );

  useEffect(() => {
    async function loadLists() {
      try {
        setLoadingLists(true);
        const [sectorResponse, affiliateResponse] = await Promise.all([
          API.get('/moa-sectors'),
          API.get('/affiliate-institutions'),
        ]);
        setMoaSectors(sectorResponse.data || []);
        setAffiliates(affiliateResponse.data || []);
      } catch (err) {
        setNotice({
          type: 'error',
          message: getApiErrorMessage(err, 'Failed to load organization settings.'),
        });
      } finally {
        setLoadingLists(false);
      }
    }

    loadLists();
  }, []);

  useEffect(() => {
    async function loadOffices() {
      if (!form.sectorId) {
        setOffices([]);
        return;
      }

      try {
        const response = await API.get(`/moa-executive-offices?sectorId=${form.sectorId}`);
        setOffices(response.data || []);
      } catch (err) {
        setNotice({
          type: 'error',
          message: getApiErrorMessage(err, 'Failed to load Lead Executive Offices.'),
        });
      }
    }

    loadOffices();
  }, [form.sectorId]);

  const update = (name, value) => {
    setNotice(null);

    if (name === 'organizationType') {
      setForm((current) => ({
        ...current,
        organizationType: value,
        organizationName: value === 'MoA' ? 'Ministry of Agriculture' : '',
        sectorId: '',
        sector: '',
        department: '',
      }));
      return;
    }

    if (name === 'sectorId') {
      const sector = moaSectors.find((item) => String(item.id) === String(value));
      setForm((current) => ({
        ...current,
        sectorId: value,
        sector: sector?.name || '',
        department: '',
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.position || !form.organizationType || !form.password) {
      setNotice({ type: 'error', message: 'Please complete all required fields.' });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setNotice({ type: 'error', message: 'Password and confirmation do not match.' });
      return;
    }

    if (form.organizationType === 'MoA' && (!form.sectorId || !form.department)) {
      setNotice({ type: 'error', message: 'Select your MoA structure and Lead Executive Office.' });
      return;
    }

    if (form.organizationType === 'Affiliate Institute' && !form.organizationName) {
      setNotice({ type: 'error', message: 'Select your affiliate institution.' });
      return;
    }

    try {
      setLoading(true);
      await API.post('/register', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        position: form.position.trim(),
        organizationType: form.organizationType,
        organizationName: form.organizationType === 'MoA' ? 'Ministry of Agriculture' : form.organizationName,
        sector: form.organizationType === 'MoA' ? form.sector : null,
        department: form.organizationType === 'MoA' ? form.department : form.department || null,
        password: form.password,
      });

      setForm(initialForm);
      setNotice({ type: 'success', message: 'Account request submitted. You can login after admin approval.' });
    } catch (err) {
      setNotice({ type: 'error', message: getApiErrorMessage(err, 'Registration failed.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {notice ? <Notice type={notice.type}>{notice.message}</Notice> : null}

      <Card>
        <Text style={styles.title}>Traveler Registration</Text>
        <Text style={styles.helper}>Your account will be reviewed before activation.</Text>

        <Field label="Full Name *" value={form.fullName} onChangeText={(value) => update('fullName', value)} />
        <Field label="Email *" value={form.email} onChangeText={(value) => update('email', value)} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Phone *" value={form.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" />
        <Field label="Position *" value={form.position} onChangeText={(value) => update('position', value)} />

        <ChoiceRow
          label="Organization *"
          value={form.organizationType}
          options={['MoA', 'Affiliate Institute']}
          onChange={(value) => update('organizationType', value)}
        />

        {form.organizationType === 'MoA' ? (
          <>
            <ChoiceRow
              label="MoA Structure *"
              value={form.sectorId}
              options={moaSectors.map((item) => ({ label: item.name, value: String(item.id) }))}
              onChange={(value) => update('sectorId', value)}
              loading={loadingLists}
            />
            {selectedSector ? <Text style={styles.selected}>Selected: {selectedSector.name}</Text> : null}
            <ChoiceRow
              label="Lead Executive Office *"
              value={form.department}
              options={offices.map((item) => item.name)}
              onChange={(value) => update('department', value)}
              disabled={!form.sectorId}
            />
          </>
        ) : null}

        {form.organizationType === 'Affiliate Institute' ? (
          <>
            <ChoiceRow
              label="Affiliate Institution *"
              value={form.organizationName}
              options={affiliates.map((item) => item.organization_name)}
              onChange={(value) => update('organizationName', value)}
              loading={loadingLists}
            />
            <Field label="Department" value={form.department} onChangeText={(value) => update('department', value)} />
          </>
        ) : null}

        <Field label="Password *" value={form.password} onChangeText={(value) => update('password', value)} secureTextEntry />
        <Field label="Confirm Password *" value={form.confirmPassword} onChangeText={(value) => update('confirmPassword', value)} secureTextEntry />

        <Button loading={loading} onPress={submit}>Submit Registration</Button>
        <Button variant="secondary" style={{ marginTop: 10 }} onPress={() => router.back()}>Back to Login</Button>
      </Card>
    </ScrollView>
  );
}

function ChoiceRow({ label, value, options, onChange, loading, disabled }) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option
  );

  return (
    <View style={styles.choiceBlock}>
      <Text style={styles.choiceLabel}>{label}</Text>
      {loading ? <Text style={styles.helper}>Loading...</Text> : null}
      <View style={styles.choiceWrap}>
        {normalizedOptions.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'primary' : 'secondary'}
            disabled={disabled}
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

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  helper: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 14,
    marginTop: 4,
  },
  choiceBlock: {
    gap: 8,
    marginBottom: 14,
  },
  choiceLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceButton: {
    minHeight: 40,
    paddingHorizontal: 12,
  },
  selected: {
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 12,
  },
});
