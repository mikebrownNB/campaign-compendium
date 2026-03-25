'use client';

import { useState } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import type { LootItem } from '@/lib/types';
import { PageHeader, Button, Input, Textarea, EmptyState, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';

const empty = { name: '', details: '', source: '', holder: '' };

export default function LootPage() {
  const { items, loading, create, update, remove } = useCampaignCrud<LootItem>('loot-items');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setForm(empty); setEditId(null); setModal('create'); };
  const openEdit = (l: LootItem) => { setForm({ name: l.name, details: l.details, source: l.source, holder: l.holder || '' }); setEditId(l.id); setModal('edit'); };
  const handleSave = async () => {
    if (!form.name.trim()) return;
    const data = { ...form, holder: form.holder || null };
    if (modal === 'create') await create(data);
    else if (editId) await update({ id: editId, ...data });
    setModal(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader icon="paid" title="Loot & Items">
        <Button onClick={openCreate}>+ New Item</Button>
      </PageHeader>
      {loading ? <p className="text-text-muted font-mono text-sm">Loading...</p> : items.length === 0 ? (
        <EmptyState icon="paid" message="No loot yet." />
      ) : (
        <div className="overflow-x-auto border border-border-subtle rounded-lg">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                {['Item', 'Details', 'Source', 'Holder'].map((h) => (
                  <th key={h} className="text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle first:rounded-tl-lg">{h}</th>
                ))}
                <th className="w-10 bg-accent-purple/5 border-b border-border-subtle rounded-tr-lg" />
              </tr>
            </thead>
            <tbody>
              {items.map((l, i) => (
                <tr key={l.id} onClick={() => openEdit(l)}
                  className={`border-b border-border-subtle/50 cursor-pointer transition-colors hover:bg-card-hover/60 group ${i % 2 === 0 ? 'bg-card/50' : 'bg-deep/30'}`}
                >
                  <td className="p-3">
                    <span className="font-display text-sm font-bold text-accent-gold group-hover:text-accent-gold/80 transition-colors">
                      {l.name}
                    </span>
                  </td>
                  <td className="p-3 max-w-xs">
                    <p className="text-text-secondary text-xs line-clamp-2">{l.details}</p>
                  </td>
                  <td className="p-3 text-text-muted font-mono text-xs">{l.source}</td>
                  <td className="p-3 text-text-secondary text-sm">{l.holder || '—'}</td>
                  <td className="p-3 text-center">
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(l.id); }}
                      className="text-text-muted/30 hover:text-accent-red text-xs font-mono transition-colors opacity-0 group-hover:opacity-100"
                    ><Icon name="close" className="text-xs" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'New Item' : 'Edit Item'}>
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Textarea label="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="S7 — Zendali" />
          <Input label="Holder" value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} placeholder="Optional" />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleSave}>{modal === 'create' ? 'Create' : 'Save'}</Button>
        </div>
      </Modal>
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Item">
        <ConfirmDelete onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
      </Modal>
    </div>
  );
}
