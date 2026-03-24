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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Item', 'Details', 'Source', 'Holder', ''].map((h) => (
                  <th key={h} className="text-left p-3 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple bg-accent-purple/5 border-b border-border-subtle first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b border-border-subtle hover:bg-card-hover/50 transition-colors cursor-pointer" onClick={() => openEdit(l)}>
                  <td className="p-3 text-accent-gold font-display text-sm font-bold">{l.name}</td>
                  <td className="p-3 text-text-secondary text-sm max-w-xs">{l.details}</td>
                  <td className="p-3 text-text-muted font-mono text-xs">{l.source}</td>
                  <td className="p-3 text-text-secondary text-sm">{l.holder || '\u2014'}</td>
                  <td className="p-3">
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(l.id); }} className="text-text-muted hover:text-accent-red text-xs font-mono"><Icon name="close" className="text-xs" /></button>
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
          <Input label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="S7 \u2014 Zendali" />
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
