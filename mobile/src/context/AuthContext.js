import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import { deleteSessionItem, getSessionItem, setSessionItem } from '../services/sessionStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          getSessionItem('ftms.token'),
          getSessionItem('ftms.user'),
        ]);

        if (!mounted) return;
        setToken(savedToken || null);
        setUser(savedUser ? JSON.parse(savedUser) : null);
      } catch {
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setReady(true);
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const response = await API.post('/login', {
      email: email.trim(),
      password,
    });

    const nextToken = response.data.token;
    const nextUser = response.data.user;

    await Promise.all([
      setSessionItem('ftms.token', nextToken),
      setSessionItem('ftms.user', JSON.stringify(nextUser)),
    ]);

    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([
      deleteSessionItem('ftms.token'),
      deleteSessionItem('ftms.user'),
    ]);

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
