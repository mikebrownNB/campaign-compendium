'use client';

import { useState, useEffect } from 'react';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { useCampaign } from '@/lib/CampaignContext';
import { useCurrentDate, writeLocalStorage, CAMPAIGN_DATE_KEY } from '@/lib/useCurrentDate';
import type { CalendarEvent, EventType } from '@/lib/types';
import { EVENT_TYPES, getCalendarConfig } from '@/lib/types';
import { PageHeader, Button, Input, Textarea, Select, ConfirmDelete } from '@/components/UI';
import { Modal } from '@/components/Modal';

const EVENT_COLORS: Record<string, string> = {
  combat:   'bg-accent-red/30 border-l-2 border-l-accent-red',
  travel:   'bg-accent-blue/30 border-l-2 border-l-accent-blue',
  social:   'bg-accent-green/30 border-l-2 border-l-accent-green',
  quest:    'bg-accent-gold/30 border-l-2 border-l-accent-gold',
  loot:     'bg-accent-orange/30 border-l-2 border-l-accent-orange',
  faction:  'bg-accent-purple/30 border-l-2 border-l-accent-purple',
  festival: 'bg-accent-pink/30 border-l-2 border-l-accent-pink',
  downtime: 'bg-text-muted/30 border-l-2 border-l-text-muted',
};

const SEASON_BADGE: Record<string, string> = {
  spring: 'bg-accent-green/20 text-accent-green',
  summer: 'bg-accent-gold/20 text-accent-gold',
  fall:   'bg-accent-orange/20 text-accent-orange',
  winter: 'bg-accent-blue/20 text-accent-blue',
};

const emptyEvent = {
  year: 1 as number,
  month: 0,
  day: 1,
  title: '',
  type: 'quest' as EventType,
  session: '',
  description: '',
};

type ModalKind = 'create' | 'edit' | 'view' | 'set-date' | null;

export default function CalendarPage() {
  const { campaign } = useCampaign();
  const calCfg = getCalendarConfig(campaign);
  const MONTHS = calCfg.months;
  const WEEKDAYS = calCfg.weekdays;
  const DAYS_PER_MONTH = calCfg.daysPerMonth;

  const { items, loading, create, update, remove } = useCampaignCrud<CalendarEvent>('calendar-events');
  const { currentDate, applyDate, mounted } = useCurrentDate();

  const [currentYear,  setCurrentYear]  = useState(1);
  const [currentMonth, setCurrentMonth] = useState(0);

  // Once the DB date has loaded, jump the view to that month (runs once)
  useEffect(() => {
    if (mounted) {
      setCurrentYear(currentDate.year);
      setCurrentMonth(currentDate.month);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);
  const [modal,        setModal]        = useState<ModalKind>(null);
  const [form,         setForm]         = useState(emptyEvent);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [viewEvent,    setViewEvent]    = useState<CalendarEvent | null>(null);
  const [dateForm,     setDateForm]     = useState({ year: 1, month: 0, day: 1 });
  const [dateSaving,   setDateSaving]   = useState(false);
  const [dateError,    setDateError]    = useState<string | null>(null);

  const month       = MONTHS[currentMonth];
  const monthEvents = items.filter((e) => e.year === currentYear && e.month === currentMonth);
  const viewingToday = currentYear === currentDate.year && currentMonth === currentDate.month;

  const openCreate = (day?: number) => {
    setForm({ ...emptyEvent, year: currentYear, month: currentMonth, day: day ?? 1 });
    setEditId(null);
    setModal('create');
  };

  const openView = (ev: CalendarEvent) => { setViewEvent(ev); setModal('view'); };

  const openEdit = (ev: CalendarEvent) => {
    setForm({ year: ev.year, month: ev.month, day: ev.day, title: ev.title, type: ev.type, session: ev.session, description: ev.description });
    setEditId(ev.id);
    setModal('edit');
  };

  const openSetDate = () => {
    setDateForm({ year: currentDate.year, month: currentDate.month, day: currentDate.day });
    setDateError(null);
    setModal('set-date');
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (modal === 'create') await create(form);
    else if (editId) await update({ id: editId, ...form });
    setModal(null);
  };

  const handleSetDate = async () => {
    setDateSaving(true);
    setDateError(null);
    const clamped = {
      year:  Math.max(1, dateForm.year),
      month: Math.max(0, Math.min(MONTHS.length - 1, dateForm.month)),
      day:   Math.max(1, Math.min(DAYS_PER_MONTH, dateForm.day)),
    };
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/settings`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key: CAMPAIGN_DATE_KEY, value: clamped }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDateError(body?.error ?? `HTTP ${res.status}`);
      } else {
        applyDate(clamped);   // update banner + localStorage
        writeLocalStorage(campaign.id, clamped);
        setModal(null);
      }
    } catch (err) {
      setDateError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setDateSaving(false);
    }
  };

  const jumpToToday = () => {
    setCurrentYear(currentDate.year);
    setCurrentMonth(currentDate.month);
  };

  const lastMonth = MONTHS.length - 1;

  const prevMonth = () => {
    if (currentMonth === 0) {
      if (currentYear > 1) { setCurrentYear(currentYear - 1); setCurrentMonth(lastMonth); }
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === lastMonth) {
      setCurrentYear(currentYear + 1); setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthEventCount = (yr: number, mo: number) =>
    items.filter((e) => e.year === yr && e.month === mo).length;

  return (
    <div className="animate-fade-in">
      <PageHeader icon="\uD83D\uDCC5" title="Calendar">
        <Button onClick={() => openCreate()}>+ New Event</Button>
      </PageHeader>

      {/* Current Date Banner */}
      {mounted && (
        <div className="flex items-center justify-between gap-3 mb-5 px-4 py-2.5 bg-gradient-to-r from-accent-gold/10 to-accent-purple/10 border border-accent-gold/20 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-accent-gold text-lg flex-shrink-0">\uD83D\uDCCD</span>
            <div className="min-w-0">
              <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-wider">Current Campaign Date</p>
              <p className="font-display text-sm font-bold text-text-primary leading-tight">
                Year {currentDate.year}
                <span className="text-text-muted font-normal mx-1.5">\u00B7</span>
                <span className="text-accent-gold">{MONTHS[currentDate.month].name}</span>
                <span className="text-text-muted font-normal mx-1.5">\u00B7</span>
                Day {currentDate.day}
                <span className={`ml-2 font-mono text-[0.55rem] uppercase px-1.5 py-0.5 rounded ${SEASON_BADGE[MONTHS[currentDate.month].season]}`}>
                  {MONTHS[currentDate.month].season}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!viewingToday && (
              <button
                onClick={jumpToToday}
                className="font-mono text-[0.65rem] text-accent-purple border border-accent-purple/30 rounded px-2 py-1 hover:bg-accent-purple/10 transition-colors whitespace-nowrap"
              >
                Jump to today
              </button>
            )}
            <button
              onClick={openSetDate}
              className="font-mono text-[0.65rem] text-accent-gold border border-accent-gold/30 rounded px-2 py-1 hover:bg-accent-gold/10 transition-colors whitespace-nowrap"
            >
              Set date
            </button>
          </div>
        </div>
      )}

      <p className="text-text-secondary text-sm mb-5">
        <strong className="text-text-primary">{MONTHS.length} months &times; {DAYS_PER_MONTH} days</strong>, {WEEKDAYS.length}-day weeks ({WEEKDAYS.join(', ')}).
        Click any day to add an event; click an event to view details.
      </p>

      {/* Year navigation */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <button
          onClick={() => setCurrentYear(y => Math.max(1, y - 1))}
          disabled={currentYear <= 1}
          className="px-3 py-1 rounded bg-card border border-border-subtle text-text-muted hover:text-text-primary disabled:opacity-30 font-mono text-xs"
        >&laquo;</button>
        <span className="px-5 py-1.5 rounded-full bg-accent-gold text-deep font-display text-xs tracking-[0.12em] uppercase font-bold shadow-md shadow-accent-gold/30">
          Year {currentYear}
        </span>
        <button
          onClick={() => setCurrentYear(y => y + 1)}
          className="px-3 py-1 rounded bg-card border border-border-subtle text-text-muted hover:text-text-primary font-mono text-xs"
        >&raquo;</button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 mb-3 flex-wrap">
        <Button variant="secondary" onClick={prevMonth} disabled={currentYear === 1 && currentMonth === 0}>Prev</Button>
        <div className="text-center min-w-[240px]">
          <span className="font-display text-xl font-bold text-accent-gold">{month.name}</span>
          <span className={`font-mono text-[0.6rem] tracking-wider uppercase ml-2 px-2 py-0.5 rounded ${SEASON_BADGE[month.season]}`}>
            {month.season}
          </span>
          <div className="font-mono text-[0.6rem] text-text-muted mt-0.5">
            Year {currentYear} \u00B7 Month {currentMonth + 1} of {MONTHS.length}
          </div>
        </div>
        <Button variant="secondary" onClick={nextMonth}>Next</Button>
      </div>

      {/* Month dot strip */}
      <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
        {MONTHS.map((m, i) => {
          const isActive = i === currentMonth;
          const isToday  = mounted && currentDate.year === currentYear && currentDate.month === i;
          const count    = monthEventCount(currentYear, i);
          return (
            <button
              key={i}
              onClick={() => setCurrentMonth(i)}
              title={m.name}
              className={`relative transition-all duration-200 rounded-full flex items-center justify-center ${
                isActive
                  ? 'w-auto h-6 px-2.5 bg-accent-gold text-deep font-mono text-[0.55rem] font-bold'
                  : `w-6 h-6 bg-card border hover:border-accent-gold text-text-muted font-mono text-[0.5rem] ${isToday ? 'border-accent-gold/60' : 'border-border-subtle'}`
              }`}
            >
              {isActive ? m.name : count > 0 ? count : <span className="w-1.5 h-1.5 rounded-full bg-border-subtle" />}
              {isToday && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-gold border border-deep" />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <p className="text-text-muted font-mono text-sm">Loading calendar...</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-[2px] bg-border-subtle border border-border-subtle rounded-lg overflow-hidden">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-accent-purple/10 text-center py-2 px-1 font-display text-[0.65rem] tracking-wider uppercase text-accent-purple">
                {d}
              </div>
            ))}

            {Array.from({ length: DAYS_PER_MONTH }, (_, i) => i + 1).map((day) => {
              const dayEvents = monthEvents.filter((e) => e.day === day);
              const weekLen = WEEKDAYS.length;
              const isWeekend = day % weekLen === weekLen - 1 || day % weekLen === 0;
              const isToday   = mounted && viewingToday && day === currentDate.day;

              return (
                <div
                  key={day}
                  onClick={() => openCreate(day)}
                  className={`min-h-[85px] p-1.5 cursor-pointer transition-colors relative hover:bg-card-hover ${
                    isToday
                      ? 'bg-accent-gold/8 ring-1 ring-inset ring-accent-gold/40'
                      : isWeekend ? 'bg-card/60' : 'bg-card'
                  }`}
                >
                  <div className={`font-mono text-xs mb-1 w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                    isToday
                      ? 'bg-accent-gold text-deep font-bold'
                      : dayEvents.length > 0 ? 'bg-accent-gold/20 text-accent-gold font-bold' : 'text-text-muted'
                  }`}>
                    {day}
                  </div>

                  {isToday && (
                    <div className="absolute top-1 right-1.5 font-mono text-[0.45rem] text-accent-gold/80 uppercase tracking-wider leading-none">
                      today
                    </div>
                  )}

                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); openView(ev); }}
                      title={ev.title}
                      className={`text-[0.5rem] font-mono px-1 py-0.5 rounded mb-0.5 text-text-primary cursor-pointer hover:brightness-125 transition-all truncate ${EVENT_COLORS[ev.type] || ''}`}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {EVENT_TYPES.map((t) => (
              <span key={t} className="flex items-center gap-1.5 font-mono text-[0.65rem] text-text-secondary">
                <span className={`w-2.5 h-2.5 rounded-sm ${EVENT_COLORS[t]?.split(' ')[0]}`} />
                {t}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Set Current Date modal */}
      <Modal open={modal === 'set-date'} onClose={() => setModal(null)} title="Set Current Campaign Date">
        <p className="text-text-secondary text-sm mb-4">
          Sets the in-game &ldquo;today&rdquo; shown on the calendar. Shared across all devices.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Year"
            type="number"
            min={1}
            value={dateForm.year}
            onChange={(e) => setDateForm({ ...dateForm, year: parseInt(e.target.value) || 1 })}
          />
          <Select
            label="Month"
            options={MONTHS.map((m, i) => ({ value: String(i), label: m.name }))}
            value={String(dateForm.month)}
            onChange={(e) => setDateForm({ ...dateForm, month: parseInt(e.target.value) })}
          />
          <Input
            label={`Day (1-${DAYS_PER_MONTH})`}
            type="number"
            min={1}
            max={DAYS_PER_MONTH}
            value={dateForm.day}
            onChange={(e) => setDateForm({ ...dateForm, day: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="mt-3 px-3 py-2 bg-card rounded-lg border border-border-subtle">
          <p className="font-mono text-xs text-text-muted">Preview</p>
          <p className="font-display text-sm font-bold text-accent-gold mt-0.5">
            Year {dateForm.year} \u00B7 {MONTHS[dateForm.month]?.name} \u00B7 Day {dateForm.day}
          </p>
        </div>
        {dateError && (
          <p className="mt-3 font-mono text-xs text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
            \u2715 Save failed: {dateError}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleSetDate} disabled={dateSaving}>
            {dateSaving ? 'Saving\u2026' : 'Set Date'}
          </Button>
        </div>
      </Modal>

      {/* View event modal */}
      <Modal open={modal === 'view' && viewEvent !== null} onClose={() => { setModal(null); setViewEvent(null); }} title={viewEvent?.title || ''}>
        {viewEvent && (
          <>
            <div className="flex gap-1.5 mb-3">
              <span className={`inline-block font-mono text-[0.6rem] uppercase px-2 py-0.5 rounded ${EVENT_COLORS[viewEvent.type]?.split(' ')[0]} text-text-primary`}>
                {viewEvent.type}
              </span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">{viewEvent.description}</p>
            <p className="font-mono text-[0.7rem] text-text-muted">
              {viewEvent.session ? `Session ${viewEvent.session} \u00B7 ` : ''}
              Year {viewEvent.year} \u00B7 {MONTHS[viewEvent.month]?.name} {viewEvent.day}
            </p>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
              <Button variant="danger" size="sm" onClick={() => { setDeleteId(viewEvent.id); setModal(null); setViewEvent(null); }}>Delete</Button>
              <Button size="sm" onClick={() => { openEdit(viewEvent); setViewEvent(null); }}>Edit</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Create / Edit modal */}
      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'New Calendar Event' : 'Edit Event'}>
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event name..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Year" type="number" min={1} value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 1 })} />
          <Select label="Month" options={MONTHS.map((m, i) => ({ value: String(i), label: m.name }))} value={String(form.month)} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={`Day (1-${DAYS_PER_MONTH})`} type="number" min={1} max={DAYS_PER_MONTH} value={form.day} onChange={(e) => setForm({ ...form, day: parseInt(e.target.value) || 1 })} />
          <Select label="Type" options={EVENT_TYPES.map((t) => ({ value: t, label: t }))} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })} />
        </div>
        <Input label="Session" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} placeholder="e.g. 15 or 7-8" />
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleSave}>{modal === 'create' ? 'Create' : 'Save'}</Button>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Event">
        <ConfirmDelete
          onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }}
          onCancel={() => setDeleteId(null)}
        />
      </Modal>
    </div>
  );
}
