import { createContext, useContext } from 'react';
import { useRequests as useRequestsSource } from '../hooks/useRequests';
import { useAuth } from './AuthContext';

const RequestsContext = createContext(null);

export function RequestsProvider({ children }) {
  const { user } = useAuth();
  const value = useRequestsSource(user);

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>;
}

export function useRequests() {
  const value = useContext(RequestsContext);
  if (!value) throw new Error('useRequests must be used within RequestsProvider');
  return value;
}
