import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Field, Notice } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { apiOrigin, getApiErrorMessage } from '../src/services/api';
import { colors } from '../src/styles/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    let step = 'sending login request';

    try {
      setLoading(true);
      setError('');
      step = 'calling login API';
      await signIn({ email, password });
    } catch (err) {
      setError(getApiErrorMessage(err, `Login failed while ${step}.`));
      setLoading(false);
      return;
    }

    try {
      step = 'opening dashboard';
      router.replace('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, `Login succeeded, but failed while ${step}.`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <View style={styles.brandBlock}>
        <Text style={styles.ministry}>Ministry of Agriculture</Text>
        <Text style={styles.title}>FTMS</Text>
        <Text style={styles.subtitle}>Foreign Travel Management System</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome Back</Text>
        <Text style={styles.cardText}>Sign in to submit, review, and track travel requests.</Text>

        {error ? <Notice type="error">{error}</Notice> : null}

        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        <Button loading={loading} onPress={submit}>Login</Button>

        <Text style={styles.apiHint}>API: {apiOrigin}</Text>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Need traveler access?</Text>
          <Link href="/register" style={styles.registerLink}>Create account</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    padding: 18,
  },
  brandBlock: {
    marginBottom: 28,
  },
  ministry: {
    color: '#d6efe2',
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 46,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    color: '#f5df9c',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 18,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  cardText: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 16,
    marginTop: 4,
  },
  registerRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
  registerText: {
    color: colors.muted,
  },
  registerLink: {
    color: colors.primary,
    fontWeight: '800',
  },
  apiHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 12,
    textAlign: 'center',
  },
});
