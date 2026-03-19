'use client';

import { useState, useEffect, useCallback } from 'react';

export function useCrud<T extends { id: string }>(apiPath: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const create = async (item: Record<string, unknown>) => {
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Create failed');
    }
    const created = await res.json() as T;
    setItems((prev) => [...prev, created]);
    return created;
  };

  const update = async (item: Record<string, unknown> & { id: string }) => {
    const res = await fetch(apiPath, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Update failed');
    }
    const updated = await res.json() as T;
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    return updated;
  };

  const remove = async (id: string) => {
    const res = await fetch(`${apiPath}?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Delete failed');
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return { items, loading, error, create, update, remove, refetch: fetchItems };
}
