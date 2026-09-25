import { useCallback, useEffect, useRef, useState } from 'react';

import {
  OperationsApiError,
  createLocalDevSession,
  fetchOperationsOverview,
  type OperationsOverview,
  type OverviewQuery,
} from './operations';

export interface OperationsState {
  overview: OperationsOverview | null;
  loading: boolean;
  refreshing: boolean;
  connecting: boolean;
  authRequired: boolean;
  error: string | null;
  query: OverviewQuery;
  refresh: (next?: OverviewQuery) => Promise<void>;
  connectLocal: () => Promise<void>;
}

export function useOperationsOverview(): OperationsState {
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<OverviewQuery>({});
  const requestId = useRef(0);

  const refresh = useCallback(async (next?: OverviewQuery) => {
    const activeQuery = next ?? query;
    if (next) setQuery(next);
    const currentRequest = ++requestId.current;
    setRefreshing(true);
    setError(null);
    try {
      const payload = await fetchOperationsOverview(activeQuery);
      if (currentRequest !== requestId.current) return;
      setOverview(payload);
      setAuthRequired(false);
    } catch (reason) {
      if (currentRequest !== requestId.current) return;
      const apiError = reason instanceof OperationsApiError ? reason : null;
      setOverview(null);
      setAuthRequired(apiError?.status === 401);
      setError(reason instanceof Error ? reason.message : 'The operations overview could not be loaded.');
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [query]);

  const connectLocal = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      await createLocalDevSession();
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not connect to Research API.');
    } finally {
      setConnecting(false);
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh({});
    return () => {
      requestId.current += 1;
    };
  }, []); // Run once; user-driven query changes call refresh directly.

  return {
    overview,
    loading,
    refreshing,
    connecting,
    authRequired,
    error,
    query,
    refresh,
    connectLocal,
  };
}
