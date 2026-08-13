import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export const unwrapRows = <T,>(result: unknown): T[] => {
    if (Array.isArray(result)) return result as T[];
    if (result && typeof result === 'object' && Array.isArray((result as any).data)) return (result as any).data;
    return [];
};

export function useApiData<T>(endpoint: string, initial: T) {
    const [data, setData] = useState<T>(initial);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const reload = useCallback(async () => {
        setLoading(true); setError('');
        try {
            setData(await api<T>(endpoint));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to load data');
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    useEffect(() => { reload(); }, [reload]);
    return { data, setData, loading, error, setError, reload };
}

export function useApiRows<T extends Record<string, any>>(endpoint: string) {
    const [rows, setRows] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const reload = useCallback(async () => {
        setLoading(true); setError('');
        if (!endpoint) { setRows([]); setLoading(false); return; }
        try {
            setRows(unwrapRows<T>(await api<unknown>(endpoint)));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to load data');
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    useEffect(() => { reload(); }, [reload]);
    return { rows, setRows, loading, error, setError, reload };
}
