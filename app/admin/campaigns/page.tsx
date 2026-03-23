'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PageHeader, Button, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';

interface AdminCampaign {
  id:           string;
  name:         string;
  slug:         string;
  subtitle:     string;
  owner_id:     string | null;
  owner_name:   string | null;
  member_count: number;
  created_at:   string;
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [allowed,   setAllowed]   = useState(false);
  const [selected,  setSelected]  = useState<AdminCampaign | null>(null);
  const [modal,     setModal]     = useState<'delete' | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/campaigns');
    if (res.ok) setCampaigns(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.app_metadata?.role === 'super_admin') {
        setAllowed(true);
        loadCampaigns();
      } else {
        setLoading(false);
      }
    });
  }, [loadCampaigns]);

  if (!allowed && !loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <span className="text-4xl">🔒</span>
        <p className="font-mono text-text-muted text-sm">Super admin access required.</p>
      </div>
    );
  }

  const flash = (msg: string, type: 'ok' | 'err') => {
    if (type === 'ok') { setSuccess(msg); setError(null); }
    else               { setError(msg);   setSuccess(null); }
    setTimeout(() => { setSuccess(null); setError(null); }, 4000);
  };

  const handleDelete = async () => {
    if (!selected) return;
    const res = await fetch(`/api/admin/campaigns?id=${selected.id}`, { method: 'DELETE' });
    if (res.ok) {
      setModal(null); setSelected(null);
      await loadCampaigns();
      flash(`Campaign "${selected.name}" deleted.`, 'ok');
    } else {
      const body = await res.json();
      flash(body.error ?? 'Failed to delete campaign.', 'err');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader icon="🗺️" title="All Campaigns" />

      {success && (
        <p className="mb-4 font-mono text-[0.65rem] text-green-400 bg-green-400/10 border border-green-400/30 rounded px-3 py-2">
          ✓ {success}
        </p>
      )}
      {error && !modal && (
        <p className="mb-4 font-mono text-[0.65rem] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
          ✕ {error}
        </p>
      )}

      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">No campaigns found.</p>
      ) : (
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3">Name</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden sm:table-cell">Owner</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden md:table-cell">Members</th>
                <th className="text-left font-mono text-[0.6rem] text-text-muted uppercase tracking-widest px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border-subtle/50 hover:bg-card-hover transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-mono text-sm text-text-primary">{c.name}</p>
                      {c.subtitle && <p className="font-mono text-[0.6rem] text-text-muted">{c.subtitle}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-mono text-[0.65rem] text-text-secondary">
                    {c.owner_name ?? <span className="text-text-muted italic">No owner</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-[0.65rem] text-text-secondary">
                    {c.member_count}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono text-[0.65rem] text-text-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => { setSelected(c); setModal('delete'); }}
                        className="font-mono text-[0.65rem] text-text-muted hover:text-accent-red transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Delete Campaign">
        <p className="text-sm text-text-secondary mb-4">
          Permanently delete <span className="text-text-primary font-mono">{selected?.name}</span> and all its data?
          This cannot be undone.
        </p>
        <ConfirmDelete onConfirm={handleDelete} onCancel={() => setModal(null)} />
      </Modal>
    </div>
  );
}
