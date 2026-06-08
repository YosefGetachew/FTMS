import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import API, { setAuthToken } from '../services/api';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,
    full_name: user.full_name || user.fullName || '',
    fullName: user.fullName || user.full_name || '',
    account_status: user.account_status || user.accountStatus || '',
    accountStatus: user.accountStatus || user.account_status || '',
  };
}

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setReady(true);
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const response = await API.post('/login', {
      email: email.trim(),
      password,
    });

    const nextToken = response.data.token;
    const nextUser = normalizeUser(response.data.user);

    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken('');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      token,
      user,
      signIn,
      signOut,
      setUser,
    }),
    [ready, signIn, signOut, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
