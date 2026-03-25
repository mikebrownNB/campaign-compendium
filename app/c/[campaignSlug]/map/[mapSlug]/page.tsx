'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useCampaign } from '@/lib/CampaignContext';
import type { MapMarker, GameLocation } from '@/lib/types';
import { useCampaignCrud } from '@/lib/useCampaignCrud';
import { Button, Input, Textarea, Select } from '@/components/UI';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { LocationDetailSlideOut } from '@/components/LocationDetailSlideOut';

const MIN_SCALE = 0.05;
const MAX_SCALE = 6;

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function touchDist(a: React.Touch, b: React.Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function touchMid(a: React.Touch, b: React.Touch) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

// --- Custom markers hook (per-map filtering) ---

function useMapMarkers(mapId: string, campaignId: string) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkers = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/campaigns/${campaignId}/map-markers?map_id=${encodeURIComponent(mapId)}`);
    const data = await res.json();
    setMarkers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [mapId, campaignId]);

  useEffect(() => { fetchMarkers(); }, [fetchMarkers]);

  const createMarker = async (body: Omit<MapMarker, 'id' | 'created_at' | 'updated_at'>) => {
    const res     = await fetch(`/api/campaigns/${campaignId}/map-markers`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...body, map_id: mapId }),
    });
    const created = await res.json() as MapMarker;
    setMarkers(prev => [...prev, created]);
    return created;
  };

  const updateMarker = async (marker: Partial<MapMarker> & { id: string }) => {
    const res     = await fetch(`/api/campaigns/${campaignId}/map-markers`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(marker),
    });
    const updated = await res.json() as MapMarker;
    setMarkers(prev => prev.map(m => m.id === updated.id ? updated : m));
    return updated;
  };

  const deleteMarker = async (id: string) => {
    await fetch(`/api/campaigns/${campaignId}/map-markers?id=${id}`, { method: 'DELETE' });
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  return { markers, loading, createMarker, updateMarker, deleteMarker };
}

// --- Component ---

export default function MapPage() {
  const params = useParams();
  const router = useRouter();
  const { campaign, maps } = useCampaign();
  const mapSlug = typeof params.mapSlug === 'string' ? params.mapSlug : '';
  const mapCfg  = maps.find(m => m.slug === mapSlug);

  const { markers, loading, createMarker, updateMarker, deleteMarker } = useMapMarkers(mapSlug, campaign.id);
  const { items: locations, create: createLocation } = useCampaignCrud<GameLocation>('locations');

  // Logged-in user's display name (for "created_by")
  const [myName, setMyName] = useState('');
  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        const n = data.user?.user_metadata?.display_name as string | undefined;
        if (n) setMyName(n);
      });
  }, []);

  // -- Viewport --
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);
  const [imgLoaded,  setImgLoaded]  = useState(false);
  const [scale,      setScale]      = useState(1);
  const [pan,        setPan]        = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Stable refs so wheel/mouse/touch handlers never read stale values
  const scaleRef = useRef(scale);
  const panRef   = useRef(pan);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { panRef.current   = pan;   }, [pan]);

  // Reset viewport when map changes
  useEffect(() => {
    setImgLoaded(false);
    setPan({ x: 0, y: 0 });
    setScale(1);
  }, [mapSlug]);

  // -- Drag (mouse) --
  const dragging  = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const didDrag   = useRef(false);

  // -- Touch state refs --
  const touchCount   = useRef(0);
  const touchStart1  = useRef({ x: 0, y: 0 });
  const touchPanStart = useRef({ x: 0, y: 0 });
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const pinchStartMid   = useRef({ x: 0, y: 0 });
  const didTouchDrag = useRef(false);

  // -- Per-pin tap tracking (pointer events) --
  const pinTapStart = useRef<{ x: number; y: number } | null>(null);

  // -- Placing mode --
  const [placing, setPlacing] = useState(false);

  // -- Legend toggle (mobile) --
  const [showLegend, setShowLegend] = useState(false);

  // -- Create-marker modal --
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingXY,  setPendingXY]  = useState({ x: 0, y: 0 });
  const emptyCreate = { label: '', note: '', location_id: '' };
  const [createForm, setCreateForm] = useState(emptyCreate);

  // -- View / edit marker (unlinked pins and pin-edit from linked pins) --
  const [viewMarker,    setViewMarker]    = useState<MapMarker | null>(null);
  const [editing,       setEditing]       = useState(false);
  const [editForm,      setEditForm]      = useState({ label: '', note: '', location_id: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // -- Location detail slideout (opened when a linked pin is clicked) --
  const [viewingLocation, setViewingLocation] = useState<GameLocation | null>(null);
  const [pinForLocation,  setPinForLocation]  = useState<MapMarker | null>(null);

  // -- Fit map to container --
  const fitMap = useCallback(() => {
    const container = containerRef.current;
    const img       = imgRef.current;
    if (!container || !img) return;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const iw = img.naturalWidth  || img.offsetWidth;
    const ih = img.naturalHeight || img.offsetHeight;
    if (!iw || !ih) return;
    const fitScale = clamp(Math.min(cw / iw, ch / ih) * 0.95, MIN_SCALE, MAX_SCALE);
    setScale(fitScale);
    setPan({ x: (cw - iw * fitScale) / 2, y: (ch - ih * fitScale) / 2 });
  }, []);

  const handleImageLoad = useCallback(() => { setImgLoaded(true); fitMap(); }, [fitMap]);

  // Fallback: if image is already cached, onLoad may not fire — check on mount/map change
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && !imgLoaded) {
      handleImageLoad();
    }
  }, [mapSlug, imgLoaded, handleImageLoad]);

  // -- Wheel zoom --
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor   = e.deltaY < 0 ? 1.12 : 0.88;
      const newScale = clamp(scaleRef.current * factor, MIN_SCALE, MAX_SCALE);
      const rect     = container.getBoundingClientRect();
      const mx       = e.clientX - rect.left;
      const my       = e.clientY - rect.top;
      const ratio    = newScale / scaleRef.current;
      setScale(newScale);
      setPan({ x: mx - (mx - panRef.current.x) * ratio, y: my - (my - panRef.current.y) * ratio });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // -- ESC cancels placing mode --
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && placing) setPlacing(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placing]);

  // -- Prevent default touch gestures on the map container (no page scroll/zoom) --
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevent = (e: TouchEvent) => { e.preventDefault(); };
    container.addEventListener('touchmove', prevent, { passive: false });
    return () => container.removeEventListener('touchmove', prevent);
  }, []);

  // -- Zoom toward container center --
  const zoomCenter = (factor: number) => {
    if (!containerRef.current) return;
    const newScale = clamp(scaleRef.current * factor, MIN_SCALE, MAX_SCALE);
    const cx       = containerRef.current.offsetWidth  / 2;
    const cy       = containerRef.current.offsetHeight / 2;
    const ratio    = newScale / scaleRef.current;
    setScale(newScale);
    setPan(p => ({ x: cx - (cx - p.x) * ratio, y: cy - (cy - p.y) * ratio }));
  };

  // -- Mouse events --
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current  = true;
    didDrag.current   = false;
    setIsDragging(true);
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  };

  const stopDrag = () => { dragging.current = false; setIsDragging(false); };

  // -- Touch events --
  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;
    touchCount.current = touches.length;
    didTouchDrag.current = false;

    if (touches.length === 1) {
      // Single finger: start pan
      touchStart1.current = { x: touches[0].clientX, y: touches[0].clientY };
      touchPanStart.current = { x: panRef.current.x, y: panRef.current.y };
    } else if (touches.length === 2) {
      // Two fingers: start pinch-to-zoom
      pinchStartDist.current  = touchDist(touches[0], touches[1]);
      pinchStartScale.current = scaleRef.current;
      const mid = touchMid(touches[0], touches[1]);
      const rect = containerRef.current!.getBoundingClientRect();
      pinchStartMid.current = { x: mid.x - rect.left, y: mid.y - rect.top };
      touchPanStart.current = { x: panRef.current.x, y: panRef.current.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 1 && touchCount.current === 1) {
      // Single finger pan
      const dx = touches[0].clientX - touchStart1.current.x;
      const dy = touches[0].clientY - touchStart1.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didTouchDrag.current = true;
      setPan({ x: touchPanStart.current.x + dx, y: touchPanStart.current.y + dy });
    } else if (touches.length === 2) {
      didTouchDrag.current = true;
      const dist = touchDist(touches[0], touches[1]);
      const ratio = dist / pinchStartDist.current;
      const newScale = clamp(pinchStartScale.current * ratio, MIN_SCALE, MAX_SCALE);

      // Zoom toward the midpoint of the two fingers
      const scaleRatio = newScale / pinchStartScale.current;
      const mx = pinchStartMid.current.x;
      const my = pinchStartMid.current.y;
      setScale(newScale);
      setPan({
        x: mx - (mx - touchPanStart.current.x) * scaleRatio,
        y: my - (my - touchPanStart.current.y) * scaleRatio,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // If it was a tap (not a drag), and we're in placing mode, place a pin
    if (!didTouchDrag.current && touchCount.current === 1 && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      if (placing && containerRef.current && imgRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mx   = touch.clientX - rect.left;
        const my   = touch.clientY - rect.top;
        const imgW = imgRef.current.offsetWidth  || 1;
        const imgH = imgRef.current.offsetHeight || 1;
        const imgX = (mx - panRef.current.x) / scaleRef.current;
        const imgY = (my - panRef.current.y) / scaleRef.current;
        setPendingXY({
          x: clamp((imgX / imgW) * 100, 0, 100),
          y: clamp((imgY / imgH) * 100, 0, 100),
        });
        setCreateForm(emptyCreate);
        setCreateOpen(true);
        setPlacing(false);
      }
    }
    touchCount.current = e.touches.length;
  };

  // -- Map background click -> place marker --
  const handleMapClick = (e: React.MouseEvent) => {
    if (didDrag.current) { didDrag.current = false; return; }
    if (!placing) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const imgW = imgRef.current?.offsetWidth  ?? 1;
    const imgH = imgRef.current?.offsetHeight ?? 1;
    const imgX = (mx - panRef.current.x) / scaleRef.current;
    const imgY = (my - panRef.current.y) / scaleRef.current;
    setPendingXY({
      x: clamp((imgX / imgW) * 100, 0, 100),
      y: clamp((imgY / imgH) * 100, 0, 100),
    });
    setCreateForm(emptyCreate);
    setCreateOpen(true);
    setPlacing(false);
  };

  // -- Pin open (no event param — pointer handlers manage tap detection independently) --
  const openMarker = (marker: MapMarker) => {
    if (marker.location_id) {
      const loc = locations.find(l => l.id === marker.location_id);
      if (loc) {
        setViewingLocation(loc);
        setPinForLocation(marker);
        return;
      }
    }
    setViewMarker(marker);
    setEditForm({ label: marker.label, note: marker.note, location_id: marker.location_id ?? '' });
    setEditing(false);
    setConfirmDelete(false);
  };

  // -- CRUD --
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!createForm.label.trim()) return;
    setCreating(true);
    try {
      // Resolve the location_id: use the chosen one, or auto-create a new location
      let locationId = createForm.location_id || null;

      if (!locationId) {
        // No existing location chosen -- create one automatically so this pin
        // always shows up in the Locations list and can be enriched later.
        const newLoc = await createLocation({
          name:        createForm.label.trim(),
          category:    'Point of Interest',
          description: createForm.note.trim(),
          tags:        [],
        });
        locationId = (newLoc as GameLocation).id;
      }

      await createMarker({
        x:           pendingXY.x,
        y:           pendingXY.y,
        label:       createForm.label,
        note:        createForm.note,
        location_id: locationId,
        created_by:  myName,
        map_id:      mapSlug,
      } as MapMarker);

      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleEditSave = async () => {
    if (!viewMarker) return;
    await updateMarker({
      id:          viewMarker.id,
      label:       editForm.label,
      note:        editForm.note,
      location_id: editForm.location_id || null,
    });
    setViewMarker(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMarker(id);
    setViewMarker(null);
    setConfirmDelete(false);
    if (pinForLocation?.id === id) { setViewingLocation(null); setPinForLocation(null); }
  };

  // -- Location options --
  const locationOptions = [
    { value: '', label: '\u2014 No linked location \u2014' },
    ...locations.slice().sort((a, b) => a.name.localeCompare(b.name))
                .map(l => ({ value: l.id, label: l.name })),
  ];

  const handleCreateLocationChange = (locationId: string) => {
    const loc = locations.find(l => l.id === locationId);
    setCreateForm(f => ({
      ...f,
      location_id: locationId,
      label: f.label || (loc?.name ?? ''),
    }));
  };

  const pinColor = (marker: MapMarker) => marker.location_id ? 'bg-accent-gold' : 'bg-accent-teal';

  if (!mapCfg) {
    return (
      <div className="fixed inset-0 md:left-56 flex items-center justify-center bg-[#12100d]">
        <p className="text-text-muted font-mono">Unknown map.</p>
      </div>
    );
  }

  // --- Render ---
  return (
    <>
      <div
        ref={containerRef}
        className={`fixed inset-0 md:left-56 overflow-hidden bg-[#12100d] z-10 touch-none
          ${placing ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onClick={handleMapClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Map image + markers (transformed together) */}
        <div
          style={{
            position:        'absolute',
            transform:       `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            pointerEvents:   'none',
          }}
        >
          <img
            ref={imgRef}
            src={mapCfg.image_url}
            alt={mapCfg.name}
            onLoad={handleImageLoad}
            draggable={false}
            style={{ display: 'block', maxWidth: 'none', userSelect: 'none' }}
          />

          {/* Markers */}
          {imgLoaded && markers.map((marker) => (
            <div
              key={marker.id}
              style={{
                position:        'absolute',
                left:            `${marker.x}%`,
                top:             `${marker.y}%`,
                transform:       `translate(-50%, -100%) scale(${1 / scale})`,
                transformOrigin: 'center bottom',
                pointerEvents:   'auto',
                zIndex:          10,
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                const t = e.touches[0];
                pinTapStart.current = { x: t.clientX, y: t.clientY };
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                if (pinTapStart.current && e.changedTouches.length > 0) {
                  const t = e.changedTouches[0];
                  const dx = Math.abs(t.clientX - pinTapStart.current.x);
                  const dy = Math.abs(t.clientY - pinTapStart.current.y);
                  if (dx < 8 && dy < 8) openMarker(marker);
                }
                pinTapStart.current = null;
              }}
              onClick={(e) => { e.stopPropagation(); openMarker(marker); }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Invisible larger tap target for mobile */}
              <div className="absolute inset-0 -m-3 md:-m-0" style={{ minWidth: 44, minHeight: 44 }} />
              <div className="flex flex-col items-center drop-shadow-xl select-none">
                <div className={`relative w-7 h-7 rounded-full border-2 border-white shadow-lg
                                flex items-center justify-center
                                hover:scale-125 transition-transform duration-150 cursor-pointer
                                ${pinColor(marker)}`}>
                  {marker.location_id
                    ? <Icon name="location_on" className="text-[10px] text-deep font-bold leading-none" />
                    : <div className="w-2.5 h-2.5 rounded-full bg-deep" />
                  }
                </div>
                <div className={`w-0.5 h-3 shadow ${pinColor(marker)}`} />
                {marker.label && (
                  <span className="mt-0.5 px-2 py-0.5 bg-deep/85 backdrop-blur-sm
                                   text-accent-gold text-[11px] font-bold font-mono
                                   rounded border border-accent-gold/40 whitespace-nowrap shadow-lg">
                    {marker.label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div
          className="absolute top-4 right-4 z-20 flex flex-col md:flex-row items-end md:items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Row 1 on mobile: map selector */}
          <select
            value={mapSlug}
            onChange={(e) => router.push(`/c/${campaign.slug}/map/${e.target.value}`)}
            className="px-3 py-1.5 bg-deep/80 backdrop-blur-sm border border-border-subtle
                       rounded text-[10px] font-mono text-accent-gold tracking-wider shadow
                       cursor-pointer hover:border-accent-gold/40 transition-colors appearance-none
                       pr-6"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c9a84c'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            {maps.map(m => (
              <option key={m.slug} value={m.slug} style={{ background: '#1a1410', color: '#e8dcc8' }}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Row 2 on mobile: action buttons */}
          <div className="flex items-center gap-2">
            {/* Pin count — desktop only */}
            {!loading && markers.length > 0 && (
              <span className="hidden md:inline-flex px-2 py-1 bg-card/80 backdrop-blur-sm border border-border-subtle
                               rounded text-[10px] font-mono text-text-muted shadow">
                {markers.length} pin{markers.length !== 1 ? 's' : ''}
              </span>
            )}

            <button
              onClick={() => setPlacing(p => !p)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold shadow-lg transition-all
                ${placing
                  ? 'bg-accent-gold text-deep ring-2 ring-accent-gold/50'
                  : 'bg-card/90 backdrop-blur-sm text-text-primary hover:bg-card border border-border-subtle'}`}
            >
              {placing
                ? <><Icon name="explore" className="text-xs align-middle" /> <span className="hidden md:inline">Click to Place</span><span className="md:hidden">Placing</span>&hellip;</>
                : <><Icon name="push_pin" className="text-xs align-middle" /> Add Pin</>}
            </button>

            <button onClick={fitMap} title="Fit to screen"
              className="px-2.5 py-1.5 rounded text-xs font-mono bg-card/90 backdrop-blur-sm
                         text-text-muted hover:text-text-primary border border-border-subtle shadow-lg transition-colors">
              &#x2b13;
            </button>
            <button onClick={() => zoomCenter(1.25)} title="Zoom in"
              className="w-7 h-7 rounded text-sm font-mono bg-card/90 backdrop-blur-sm
                         text-text-muted hover:text-text-primary border border-border-subtle shadow-lg transition-colors">
              +
            </button>
            <button onClick={() => zoomCenter(0.8)} title="Zoom out"
              className="w-7 h-7 rounded text-sm font-mono bg-card/90 backdrop-blur-sm
                         text-text-muted hover:text-text-primary border border-border-subtle shadow-lg transition-colors">
              &minus;
            </button>

            {/* Scale % — desktop only */}
            <span className="hidden md:inline-flex px-2 py-1 bg-card/80 backdrop-blur-sm border border-border-subtle
                             rounded text-[10px] font-mono text-text-muted shadow min-w-[3.5rem] text-center">
              {Math.round(scale * 100)}%
            </span>

            {/* Legend toggle — mobile only */}
            <button
              onClick={() => setShowLegend(l => !l)}
              title="Legend"
              className="md:hidden w-7 h-7 rounded text-sm font-mono bg-card/90 backdrop-blur-sm
                         text-text-muted hover:text-text-primary border border-border-subtle shadow-lg transition-colors"
            >
              ?
            </button>
          </div>
        </div>

        {/* Legend — always visible on desktop, toggled on mobile */}
        <div
          className={`absolute bottom-4 left-4 z-20 flex-col gap-1.5 bg-card/80 backdrop-blur-sm
                     border border-border-subtle rounded-lg px-3 py-2 text-[10px] font-mono text-text-muted
                     ${showLegend ? 'flex md:flex' : 'hidden md:flex'}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-gold border border-white/50" />
            <span>Linked location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-teal border border-white/50" />
            <span>Custom pin</span>
          </div>
        </div>

        {/* Placing hint — with cancel button for mobile */}
        {placing && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3
                         px-5 py-2.5 bg-accent-gold text-deep text-xs font-mono font-bold
                         rounded-full shadow-xl animate-pulse">
            <span className="pointer-events-none">
              <span className="hidden md:inline">Click anywhere on the map to drop a pin &mdash; ESC to cancel</span>
              <span className="md:hidden">Tap to drop a pin</span>
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setPlacing(false); }}
              className="md:hidden pointer-events-auto bg-deep/80 text-accent-gold px-2 py-0.5 rounded-full
                         text-[10px] font-bold hover:bg-deep transition-colors"
            >
              &times; Cancel
            </button>
          </div>
        )}

        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-text-muted font-mono text-sm">Loading map&hellip;</p>
          </div>
        )}
      </div>

      {/* Create pin modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Map Pin">
        <div className="flex flex-col gap-3">
          <Input
            label="Name"
            value={createForm.label}
            onChange={(e) => setCreateForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Location name — required"
          />
          <Textarea
            label="Notes"
            value={createForm.note}
            onChange={(e) => setCreateForm(f => ({ ...f, note: e.target.value }))}
            rows={4}
            placeholder="Description or notes for this location…"
          />
          <Select
            label="Link to existing location (optional)"
            value={createForm.location_id}
            onChange={(e) => handleCreateLocationChange(e.target.value)}
            options={locationOptions}
          />
          <p className="text-text-muted text-[0.65rem] font-mono leading-relaxed">
            {createForm.location_id
              ? "Pin will open the selected location\u2019s detail panel."
              : 'A new location will be created automatically and linked to this pin.'}
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!createForm.label.trim() || creating}>
              {creating ? 'Dropping\u2026' : 'Drop Pin'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View / edit unlinked pin modal */}
      <Modal
        open={viewMarker !== null}
        onClose={() => { setViewMarker(null); setConfirmDelete(false); setEditing(false); }}
        title={editing ? 'Edit Pin' : (viewMarker?.label || 'Map Pin')}
      >
        {confirmDelete ? (
          <div className="flex flex-col gap-4">
            <p className="text-text-secondary text-sm">
              Delete pin <span className="text-accent-gold font-semibold">{viewMarker?.label}</span>? This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => viewMarker && handleDelete(viewMarker.id)}>Delete</Button>
            </div>
          </div>
        ) : editing ? (
          <div className="flex flex-col gap-3">
            <Select
              label="Link to Location (optional)"
              value={editForm.location_id}
              onChange={(e) => {
                const loc = locations.find(l => l.id === e.target.value);
                setEditForm(f => ({ ...f, location_id: e.target.value, label: f.label || (loc?.name ?? '') }));
              }}
              options={locationOptions}
            />
            <Input
              label="Pin Label"
              value={editForm.label}
              onChange={(e) => setEditForm(f => ({ ...f, label: e.target.value }))}
            />
            <Textarea
              label="Notes"
              value={editForm.note}
              onChange={(e) => setEditForm(f => ({ ...f, note: e.target.value }))}
              rows={4}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {viewMarker?.created_by && (
              <p className="font-mono text-[0.65rem] text-text-muted">Placed by {viewMarker.created_by}</p>
            )}
            {viewMarker?.note ? (
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{viewMarker.note}</p>
            ) : (
              <p className="text-text-muted text-sm italic">No notes for this pin.</p>
            )}
            <div className="flex justify-between pt-2 border-t border-border-subtle">
              <Button variant="ghost" className="text-accent-red hover:text-accent-red" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button onClick={() => setEditing(true)}>Edit</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Location detail slideout */}
      <LocationDetailSlideOut
        location={viewingLocation}
        onClose={() => { setViewingLocation(null); setPinForLocation(null); }}
        onEditPin={pinForLocation ? () => {
          setViewMarker(pinForLocation);
          setEditForm({ label: pinForLocation.label, note: pinForLocation.note, location_id: pinForLocation.location_id ?? '' });
          setEditing(true);
        } : undefined}
        onDeletePin={pinForLocation ? () => {
          handleDelete(pinForLocation.id);
          setViewingLocation(null);
          setPinForLocation(null);
        } : undefined}
        pinNote={pinForLocation?.note || undefined}
      />
    </>
  );
}
