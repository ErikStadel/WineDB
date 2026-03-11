import React, { useState, useEffect, useRef, MutableRefObject, useCallback } from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { mockWines } from '../mocks/mockWines';
import EditWineScreen from './EditWineScreen';
import WineDetailScreen from './WineDetailScreen';

interface Wine {
  _id: { $oid: string };
  name: string;
  rebsorte?: string;
  farbe?: string;
  preis?: string;
  kauforte?: string[];
  geschmack?: string[];
  kategorie?: string;
  unterkategorie?: string;
  notizen?: string;
  bewertung?: number;
  imageUrl?: string;
  timestamp: { $date: string };
  score?: number;
}

interface WineDBScreenProps {
  onBack: () => void;
  apiUrl: string;
  scrollPosition: MutableRefObject<number>;
}

type SortField = 'timestamp' | 'bewertung' | null;
type SortDirection = 'asc' | 'desc';

const wineStripeColor = (farbe?: string) => {
  if (farbe === 'Rot')  return 'var(--color-wine-red)';
  if (farbe === 'Rosé') return 'var(--color-wine-rose)';
  return 'var(--color-wine-white)';
};

const WineDBScreen: React.FC<WineDBScreenProps> = ({ onBack, apiUrl, scrollPosition }) => {
  const [wines, setWines]                   = useState<Wine[]>([]);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [sortOpen, setSortOpen]             = useState(false);
  const [filters, setFilters]               = useState({ search: '', farbe: '', kauforte: '', kategorie: '' });
  const [sortField, setSortField]           = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection]   = useState<SortDirection>('desc');
  const [selectedImage, setSelectedImage]   = useState<string | null>(null);
  const [editingWineId, setEditingWineId]   = useState<string | null>(null);
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError]                   = useState<string | null>(null);
  const [isSearching, setIsSearching]       = useState(false);
  const [hasMore, setHasMore]               = useState(false);

  const hasRestoredRef   = useRef<boolean>(false);
  const isMainScreenRef  = useRef<boolean>(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Scroll ─────────────────────────────────────────────── */
  const saveScrollPosition = useCallback(() => {
    if (isMainScreenRef.current) scrollPosition.current = window.scrollY;
  }, []);

  const restoreScrollPosition = useCallback(() => {
    if (scrollPosition.current > 0 && !hasRestoredRef.current) {
      hasRestoredRef.current = true;
      setTimeout(() => window.scrollTo({ top: scrollPosition.current, behavior: 'auto' }), 50);
    }
  }, []);

  /* ── Sort ───────────────────────────────────────────────── */
  const sortedWines = useCallback(() => {
    if (!sortField) return wines;
    return [...wines].sort((a, b) => {
      const aVal = sortField === 'timestamp'
        ? new Date(a.timestamp.$date).getTime()
        : (a.bewertung ?? 0);
      const bVal = sortField === 'timestamp'
        ? new Date(b.timestamp.$date).getTime()
        : (b.bewertung ?? 0);
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [wines, sortField, sortDirection]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const SortArrow = ({ field }: { field: SortField }) => (
    <span style={{ marginLeft: 4, fontSize: '0.7rem', opacity: sortField === field ? 1 : 0.3 }}>
      {sortField === field && sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  );

  /* ── Search ─────────────────────────────────────────────── */
  const performSearch = useCallback(async (searchParams: typeof filters) => {
    if (process.env.REACT_APP_USE_MOCK_DATA === 'true') {
      const sl = searchParams.search.toLowerCase();
      setWines(mockWines.filter((wine: Wine) => {
        const matchesSearch = !searchParams.search ||
          wine.name.toLowerCase().includes(sl) ||
          (wine.rebsorte && wine.rebsorte.toLowerCase().includes(sl)) ||
          (wine.notizen  && wine.notizen.toLowerCase().includes(sl));
        return matchesSearch &&
          (!searchParams.farbe     || wine.farbe === searchParams.farbe) &&
          (!searchParams.kauforte  || (wine.kauforte && wine.kauforte.includes(searchParams.kauforte))) &&
          (!searchParams.kategorie || wine.kategorie === searchParams.kategorie);
      }));
      setHasMore(false);
      setTimeout(restoreScrollPosition, 100);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchParams.search)    params.append('q', searchParams.search);
      if (searchParams.farbe)     params.append('farbe', searchParams.farbe);
      if (searchParams.kauforte)  params.append('kauforte', searchParams.kauforte);
      if (searchParams.kategorie) params.append('kategorie', searchParams.kategorie);
      params.append('limit', '50');

      const { data } = await axios.get(`${apiUrl}/wines/search?${params}`, { timeout: 10000 });
      const fmt = (w: any) => ({
        ...w,
        _id:       typeof w._id       === 'string' ? { $oid: w._id }       : w._id,
        timestamp: typeof w.timestamp === 'string' ? { $date: w.timestamp } : w.timestamp,
      });
      const formattedWines = data.wines.map(fmt);
      setWines(formattedWines);
      setHasMore(data.hasMore);

      if (searchParams.search && wines.length !== formattedWines.length) {
        window.scrollTo(0, 0); hasRestoredRef.current = true;
      } else {
        setTimeout(restoreScrollPosition, 100);
      }
    } catch {
      try {
        const { data } = await axios.get(`${apiUrl}/wines/search-fallback`, { params: searchParams, timeout: 15000 });
        setWines(data.wines.map((w: any) => ({
          ...w,
          _id:       typeof w._id       === 'string' ? { $oid: w._id }       : w._id,
          timestamp: typeof w.timestamp === 'string' ? { $date: w.timestamp } : w.timestamp,
        })));
        setHasMore(false);
      } catch {
        setError('Fehler bei der Suche. Versuche es erneut.');
        setWines(mockWines);
      }
      setTimeout(restoreScrollPosition, 100);
    } finally {
      setIsSearching(false);
    }
  }, [apiUrl, restoreScrollPosition]);

  const debouncedSearch = useCallback((sp: typeof filters) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => performSearch(sp), 300);
  }, [performSearch]);

  useEffect(() => { debouncedSearch(filters); }, [filters, refreshTrigger, debouncedSearch]);

  useEffect(() => {
    if (!selectedWineId && !editingWineId) {
      isMainScreenRef.current = true;
      window.addEventListener('scroll', saveScrollPosition, { passive: true });
      return () => window.removeEventListener('scroll', saveScrollPosition);
    } else {
      isMainScreenRef.current = false;
    }
  }, [selectedWineId, editingWineId, saveScrollPosition]);

  useEffect(() => () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); }, []);

  const handleEdit        = (id: Wine['_id']) => { saveScrollPosition(); setEditingWineId(id.$oid); };
  const handleViewDetails = (id: Wine['_id']) => { saveScrollPosition(); setSelectedWineId(id.$oid); };
  const handleEditBack    = (refresh = false) => {
    setEditingWineId(null); hasRestoredRef.current = false;
    if (refresh) setRefreshTrigger(p => p + 1);
    else setTimeout(restoreScrollPosition, 50);
  };
  const handleDetailBack = () => {
    setSelectedWineId(null); hasRestoredRef.current = false;
    setTimeout(restoreScrollPosition, 50);
  };
  const handleFilterChange = (key: keyof typeof filters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  if (editingWineId) return <EditWineScreen wineId={editingWineId} onBack={handleEditBack} apiUrl={apiUrl} />;
  if (selectedWineId) return <WineDetailScreen wineId={selectedWineId} onBack={handleDetailBack} apiUrl={apiUrl} />;

  const displayedWines = sortedWines();
  const sortLabel = sortField === 'timestamp'
    ? `Datum ${sortDirection === 'desc' ? '↓' : '↑'}`
    : sortField === 'bewertung'
    ? `Bewertung ${sortDirection === 'desc' ? '↓' : '↑'}`
    : null;

  /* Reusable inline styles */
  const inputStyle: React.CSSProperties = {
    width: '100%', maxWidth: '100%',
    padding: '0.65rem 0.9rem',
    border: '1px solid var(--color-input-border)',
    borderRadius: 4,
    background: 'var(--color-input-bg)',
    color: 'var(--color-text-primary)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.9rem',
  };
  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.68rem',
    fontWeight: 500,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'var(--color-accent)',
    margin: 0,
  };
  const chevron: React.CSSProperties = { fontSize: '0.62rem', color: 'var(--color-accent)', opacity: 0.7 };

  return (
    <div className="App relative">
      <header className="glass-header">
        <h1 className="header-title">Wein Datenbank</h1>
        <span className="header-back" onClick={onBack}>Zurück</span>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center gap-4 overflow-y-auto">

        {/* ── Filter ── */}
        <section className="glass-card w-full max-w-3xl" style={{ marginBottom: 0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
               onClick={() => setFilterOpen(!filterOpen)}>
            <span style={sectionLabelStyle}>Filter & Suche</span>
            <span style={chevron}>{filterOpen ? '▲' : '▼'}</span>
          </div>

          {filterOpen && (
            <div style={{ marginTop: '1rem', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              <div style={{ position:'relative' }}>
                <input
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  placeholder="Name, Rebsorte, Notizen…"
                  style={{ ...inputStyle, paddingRight: '2.2rem' }}
                />
                {isSearching && (
                  <div style={{ position:'absolute', right:'0.6rem', top:'50%', transform:'translateY(-50%)' }}>
                    <div className="loader" style={{ width:16, height:16, margin:0, borderWidth:2 }} />
                  </div>
                )}
              </div>
              {([
                { key:'farbe',     label:'Alle Farben',     opts:['Rot','Weiß','Rosé'] },
                { key:'kauforte',  label:'Alle Kauforte',   opts:['Rewe','Kaufland','Hit','Aldi','Lidl','Edeka','Henkell','Wo anders'] },
                { key:'kategorie', label:'Alle Kategorien', opts:['Evergreen','Kochwein','Seltene Weine','Weinstand'] },
              ]).map(({ key, label, opts }) => (
                <select key={key}
                  value={filters[key as keyof typeof filters]}
                  onChange={e => handleFilterChange(key as keyof typeof filters, e.target.value)}
                  style={inputStyle}
                >
                  <option value="">{label}</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
            </div>
          )}
        </section>

        {/* ── Sort ── */}
        <section className="glass-card w-full max-w-3xl"
                 style={{ marginBottom:0, padding:'0.75rem 1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
               onClick={() => setSortOpen(!sortOpen)}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <span style={sectionLabelStyle}>Sortierung</span>
              {sortLabel && (
                <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'0.72rem', color:'var(--color-text-muted)' }}>
                  – {sortLabel}
                </span>
              )}
            </div>
            <span style={chevron}>{sortOpen ? '▲' : '▼'}</span>
          </div>

          {sortOpen && (
            <div style={{ marginTop:'0.85rem', display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
              {([['timestamp','Datum'],['bewertung','Bewertung']] as [SortField, string][]).map(([field, label]) => (
                <button key={field}
                  onClick={() => handleSortToggle(field)}
                  className={`sort-btn${sortField === field ? ' active' : ''}`}
                >
                  {label}<SortArrow field={field} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Wine List ── */}
        <section className="flex flex-col gap-4 w-full max-w-3xl">
          {displayedWines.length === 0 && !isSearching && (
            <div className="glass-card" style={{ padding:'1rem', textAlign:'center' }}>
              <p style={{ color:'var(--color-text-secondary)', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem' }}>
                {filters.search ? 'Keine Ergebnisse gefunden.' : 'Keine Weine in der Datenbank.'}
              </p>
            </div>
          )}

          {displayedWines.map(wine => (
            <div key={wine._id.$oid}
                 className="glass-card wine-entry wine-entry-editable"
                 style={{ padding:'1rem 1.25rem', display:'flex', gap:'0.75rem', alignItems:'flex-start' }}>

              {/* Colour stripe */}
              <div style={{ width:3, alignSelf:'stretch', borderRadius:2, flexShrink:0,
                            background: wineStripeColor(wine.farbe) }} />

              {/* Thumbnail */}
              <div style={{ width:52, height:52, flexShrink:0,
                            background:'var(--color-glass-bg)',
                            border:'1px solid var(--color-glass-border)',
                            borderRadius:4, overflow:'hidden',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                {wine.imageUrl && (
                  <img src={wine.imageUrl} alt={wine.name}
                    style={{ width:'100%', height:'100%', objectFit:'contain', cursor:'pointer' }}
                    onClick={() => setSelectedImage(prev => prev === wine.imageUrl ? null : wine.imageUrl || null)}
                  />
                )}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'0.25rem' }}>
                  <div>
                    <h3 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', fontWeight:500,
                                 color:'var(--color-text-primary)', margin:0 }}>
                      {wine.name}
                      {wine.score && (
                        <span style={{ fontSize:'0.68rem', color:'var(--color-accent)', marginLeft:6, opacity:0.65 }}>
                          ({Math.round(wine.score * 100) / 100})
                        </span>
                      )}
                    </h3>
                    <p style={{ fontSize:'0.72rem', color:'var(--color-accent)', letterSpacing:'0.06em', marginTop:2 }}>
                      {wine.rebsorte || 'N/A'} · {wine.farbe || 'N/A'}
                    </p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:'0.78rem', color:'var(--color-text-secondary)' }}>{wine.kategorie || 'N/A'}</p>
                    <p style={{ fontSize:'0.72rem', color:'var(--color-text-muted)' }}>{wine.unterkategorie || 'N/A'}</p>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.5rem',
                              fontSize:'0.8rem', color:'var(--color-text-secondary)', flexWrap:'wrap', gap:'0.25rem' }}>
                  <span>{wine.preis || 'N/A'}</span>
                  <span>
                    <span style={{ color:'var(--color-star-active)', letterSpacing:2 }}>
                      {'★'.repeat(wine.bewertung || 0)}
                    </span>
                    <span style={{ color:'var(--color-star-inactive)', letterSpacing:2 }}>
                      {'★'.repeat(5 - (wine.bewertung || 0))}
                    </span>
                  </span>
                </div>
              </div>

              {/* Icons */}
              <svg onClick={() => handleEdit(wine._id)} className="edit-icon"
                   width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <svg onClick={() => handleViewDetails(wine._id)} className="view-icon"
                   width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          ))}

          {hasMore && (
            <div className="glass-card" style={{ padding:'1rem', textAlign:'center' }}>
              <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', fontFamily:'DM Sans,sans-serif' }}>
                Weitere Ergebnisse verfügbar. Verfeinere deine Suche für präzisere Ergebnisse.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Entwickelt mit Liebe zum Wein</p>
      </footer>

      {selectedImage && ReactDOM.createPortal(
        <div className="image-overlay" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Vergrößerte Ansicht" onClick={e => e.stopPropagation()} />
          <span className="close-button" onClick={() => setSelectedImage(null)}>×</span>
        </div>,
        document.getElementById('image-portal-root') as HTMLElement
      )}
    </div>
  );
};

export default WineDBScreen;