import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import { getRoleAliases } from '../utils/format';

export function useRequests(user) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async () => {
    if (!user?.role) return;

    try {
      setLoading(true);
      setError('');

      const responses = await Promise.allSettled(
        getRoleAliases(user.role).map((role) => {
          const params = new URLSearchParams({
            role,
            email: user.email || '',
            id: user.id ? String(user.id) : '',
          });

          return API.get(`/requests?${params.toString()}`);
        })
      );

      const successful = responses
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value.data || []);

      if (!successful.length) {
        const failed = responses.find((result) => result.status === 'rejected');
        if (failed) throw failed.reason;
      }

      const merged = new Map();
      successful.forEach((request) => merged.set(request.id, request));
      setRequests([...merged.values()].sort((a, b) => b.id - a.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id, user?.role]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const summary = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((item) => item.final_status === 'pending').length,
      returned: requests.filter((item) => item.final_status === 'amended').length,
      completed: requests.filter((item) => ['approved', 'rejected'].includes(item.final_status)).length,
    }),
    [requests]
  );

  return {
    requests,
    loading,
    error,
    summary,
    refresh: fetchRequests,
  };
}
