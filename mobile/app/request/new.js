import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API from '../../src/services/api';
import { colors } from '../../src/styles/theme';

const initialForm = {
  organizationType: '',
  travelerType: '',
  workflowType: '',
  sector: '',
  leadExecutiveOffice: '',
  organizationName: '',
  fullName: '',
  position: '',
  department: '',
  email: '',
  phone: '',
  country: '',
  startDate: '',
  endDate: '',
  purpose: '',
  sponsor: '',
  passportNumber: '',
  passportFile: null,
  invitationLetter: null,
  torFile: null,
};

const workflowTypes = [
  { label: 'Sector', value: 'sector_structure' },
  { label: 'CEO', value: 'ceo_structure' },
  { label: "Office Head", value: 'office_head_structure' },
];

export default function NewRequestScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    ...initialForm,
    fullName: user?.full_name || '',
    email: user?.email || '',
    position: user?.position || '',
    department: user?.department || '',
  });
  const [structures, setStructures] = useState([]);
  const [offices, setOffices] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const sectorOptions = useMemo(
    () => structures.filter((item) => item.workflow_type === form.workflowType),
    [form.workflowType, structures]
  );
  const officeOptions = useMemo(
    () => offices.filter((item) => item.sector_name === form.sector),
    [form.sector, offices]
  );

  useEffect(() => {
    async function loadSettings() {
      try {
        const [structureResponse, officeResponse, affiliateResponse] = await Promise.all([
          API.get('/moa-sectors'),
          API.get('/moa-executive-offices'),
          API.get('/affiliate-institutions'),
        ]);
        setStructures(structureResponse.data || []);
        setOffices(officeResponse.data || []);
        setAffiliates(affiliateResponse.data || []);
      } catch {
        setNotice({ type: 'error', message: 'Failed to load organization settings.' });
      }
    }

    loadSettings();
  }, []);

  const update = (name, value) => {
    setNotice(null);

    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'organizationType') {
        next.travelerType = '';
        next.workflowType = '';
        next.sector = '';
        next.leadExecutiveOffice = '';
        next.organizationName = '';
      }
      if (name === 'workflowType') {
        next.sector = '';
        next.leadExecutiveOffice = '';
      }
      if (name === 'sector') next.leadExecutiveOffice = '';
      return next;
    });
  };

  const pickFile = async (name) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/png', 'image/jpeg'],
    });

    if (!result.canceled) {
      update(name, result.assets[0]);
    }
  };

  const validate = () => {
    if (!form.organizationType || !form.fullName || !form.position || !form.department || !form.email || !form.country || !form.startDate || !form.endDate || !form.purpose) {
      return 'Please complete all required fields.';
    }
    if (form.organizationType === 'moa' && (!form.travelerType || !form.workflowType || !form.sector || !form.leadExecutiveOffice)) {
      return 'Complete the MoA traveler structure and Lead Executive Office.';
    }
    if (form.organizationType === 'affiliate' && !form.organizationName) {
      return 'Select the affiliate institution.';
    }
    if (form.endDate < form.startDate) return 'End date must be on or after start date.';
    return '';
  };

  const submit = async () => {
    const error = validate();
    if (error) {
      setNotice({ type: 'error', message: error });
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();
      const isAffiliate = form.organizationType === 'affiliate';

      data.append('travelerCategory', isAffiliate ? 'affiliate_institution' : form.travelerType);
      data.append('workflowType', isAffiliate ? 'office_head_structure' : form.workflowType);
      data.append('organizationName', isAffiliate ? form.organizationName : 'MoA');
      data.append('department', form.organizationType === 'moa' ? form.leadExecutiveOffice : form.department);

      ['fullName', 'position', 'sector', 'email', 'phone', 'country', 'startDate', 'endDate', 'purpose', 'sponsor', 'passportNumber'].forEach((key) => {
        if (form[key]) data.append(key, form[key]);
      });

      ['passportFile', 'invitationLetter', 'torFile'].forEach((key) => {
        const file = form[key];
        if (file) {
          data.append(key, {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
          });
        }
      });

      const created = (await API.post('/requests', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data;

      if (created?.id) {
        await API.put(`/requests/${created.id}/status`, {
          action: 'submit',
          role: user?.role || 'traveler',
          actorEmail: user?.email || form.email,
          actorId: user?.id || null,
          comment: 'Request prepared and submitted from FTMS mobile.',
        });
      }

      setNotice({ type: 'success', message: 'Travel request submitted successfully.' });
      setTimeout(() => router.replace('/requests'), 600);
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.error || 'Failed to submit request.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {notice ? <Notice type={notice.type}>{notice.message}</Notice> : null}

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Organization</Text>
        <ChoiceRow label="Organization Type *" value={form.organizationType} options={[{ label: 'MoA', value: 'moa' }, { label: 'Affiliate', value: 'affiliate' }]} onChange={(value) => update('organizationType', value)} />

        {form.organizationType === 'moa' ? (
          <>
            <ChoiceRow label="Traveler Type *" value={form.travelerType} options={[{ label: 'Higher Official', value: 'higher_official' }, { label: 'Expert', value: 'expert' }]} onChange={(value) => update('travelerType', value)} />
            <ChoiceRow label="Structure Type *" value={form.workflowType} options={workflowTypes} onChange={(value) => update('workflowType', value)} />
            <ChoiceRow label="Structure *" value={form.sector} options={sectorOptions.map((item) => item.name)} onChange={(value) => update('sector', value)} />
            <ChoiceRow label="Lead Executive Office *" value={form.leadExecutiveOffice} options={officeOptions.map((item) => item.name)} onChange={(value) => update('leadExecutiveOffice', value)} disabled={!form.sector} />
          </>
        ) : null}

        {form.organizationType === 'affiliate' ? (
          <ChoiceRow label="Affiliate Institution *" value={form.organizationName} options={affiliates.map((item) => item.organization_name)} onChange={(value) => update('organizationName', value)} />
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Traveler</Text>
        <Field label="Full Name *" value={form.fullName} onChangeText={(value) => update('fullName', value)} />
        <Field label="Position *" value={form.position} onChangeText={(value) => update('position', value)} />
        <Field label="Department *" value={form.department} onChangeText={(value) => update('department', value)} />
        <Field label="Email *" value={form.email} onChangeText={(value) => update('email', value)} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Phone" value={form.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Trip</Text>
        <Field label="Destination Country *" value={form.country} onChangeText={(value) => update('country', value)} />
        <Field label="Start Date *" value={form.startDate} onChangeText={(value) => update('startDate', value)} placeholder="YYYY-MM-DD" />
        <Field label="End Date *" value={form.endDate} onChangeText={(value) => update('endDate', value)} placeholder="YYYY-MM-DD" />
        <Field label="Sponsor" value={form.sponsor} onChangeText={(value) => update('sponsor', value)} />
        <Field label="Passport Number" value={form.passportNumber} onChangeText={(value) => update('passportNumber', value)} />
        <Field label="Purpose *" value={form.purpose} onChangeText={(value) => update('purpose', value)} multiline />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Attachments</Text>
        <FileButton label="Passport Copy" file={form.passportFile} onPress={() => pickFile('passportFile')} />
        <FileButton label="Invitation Letter" file={form.invitationLetter} onPress={() => pickFile('invitationLetter')} />
        <FileButton label="Terms of Reference" file={form.torFile} onPress={() => pickFile('torFile')} />
      </Card>

      <Button loading={loading} onPress={submit}>Submit Request</Button>
    </ScrollView>
  );
}

function FileButton({ label, file, onPress }) {
  return (
    <View style={styles.fileRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fileLabel}>{label}</Text>
        <Text style={styles.fileName}>{file?.name || 'Optional PDF/JPG/PNG'}</Text>
      </View>
      <Button variant="secondary" style={styles.fileButton} onPress={onPress}>Upload</Button>
    </View>
  );
}

function ChoiceRow({ label, value, options, onChange, disabled }) {
  const normalized = options.map((item) => typeof item === 'string' ? { label: item, value: item } : item);
  return (
    <View style={styles.choiceBlock}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <View style={styles.choiceWrap}>
        {normalized.length === 0 ? <Text style={styles.emptyChoice}>No options loaded</Text> : null}
        {normalized.map((option) => (
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
  page: { backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  card: { marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  choiceBlock: { gap: 8, marginBottom: 14 },
  choiceLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceButton: { minHeight: 40, paddingHorizontal: 12 },
  emptyChoice: { color: colors.muted },
  fileRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 12 },
  fileLabel: { color: colors.text, fontWeight: '900' },
  fileName: { color: colors.muted, marginTop: 2 },
  fileButton: { minHeight: 40, minWidth: 92 },
});
