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

const WineDBScreen: React.FC<WineDBScreenProps> = ({ onBack, apiUrl, scrollPosition }) => {
  const [wines, setWines] = useState<Wine[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    farbe: '',
    kauforte: '',
    kategorie: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingWineId, setEditingWineId] = useState<string | null>(null);
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const hasRestoredRef = useRef<boolean>(false);
  const isMainScreenRef = useRef<boolean>(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll-Position speichern
  const saveScrollPosition = useCallback(() => {
    if (isMainScreenRef.current) {
      scrollPosition.current = window.scrollY;
    }
  }, []);

  // Scroll-Position wiederherstellen
  const restoreScrollPosition = useCallback(() => {
    if (scrollPosition.current > 0 && !hasRestoredRef.current) {
      hasRestoredRef.current = true;
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition.current,
          behavior: 'auto',
        });
      }, 50);
    }
  }, []);

  // Atlas Search Function
  const performSearch = useCallback(
    async (searchParams: typeof filters) => {
      const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';

      if (useMockData) {
        const filteredMockWines = mockWines.filter((wine: Wine) => {
          const searchLower = searchParams.search.toLowerCase();
          const matchesSearch =
            !searchParams.search ||
            wine.name.toLowerCase().includes(searchLower) ||
            (wine.rebsorte && wine.rebsorte.toLowerCase().includes(searchLower)) ||
            (wine.notizen && wine.notizen.toLowerCase().includes(searchLower));

          const matchesFilters =
            (!searchParams.farbe || wine.farbe === searchParams.farbe) &&
            (!searchParams.kauforte || (wine.kauforte && wine.kauforte.includes(searchParams.kauforte))) &&
            (!searchParams.kategorie || wine.kategorie === searchParams.kategorie);

          return matchesSearch && matchesFilters;
        });

        setWines(filteredMockWines);
        setHasMore(false);
        setTimeout(restoreScrollPosition, 100);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchParams.search) params.append('q', searchParams.search);
        if (searchParams.farbe) params.append('farbe', searchParams.farbe);
        if (searchParams.kauforte) params.append('kauforte', searchParams.kauforte);
        if (searchParams.kategorie) params.append('kategorie', searchParams.kategorie);
        params.append('limit', '50');

        const response = await axios.get(`${apiUrl}/wines/search?${params.toString()}`, {
          timeout: 10000,
        });

        const { wines: searchResults, hasMore: moreResults } = response.data;

        const formattedWines = searchResults.map((wine: any) => ({
          ...wine,
          _id: typeof wine._id === 'string' ? { $oid: wine._id } : wine._id,
          timestamp: typeof wine.timestamp === 'string' ? { $date: wine.timestamp } : wine.timestamp,
        }));

        setWines(formattedWines);
        setHasMore(moreResults);

        // Nur bei neuer Suche Scroll-Position zurücksetzen
        if (searchParams.search && wines.length !== formattedWines.length) {
          window.scrollTo(0, 0);
          hasRestoredRef.current = true;
        } else {
          setTimeout(restoreScrollPosition, 100);
        }
      } catch (err: any) {
        console.error('Atlas Search Fehler:', err);

        try {
          const response = await axios.get(`${apiUrl}/wines/search-fallback`, {
            params: searchParams,
            timeout: 15000,
          });

          const formattedWines = response.data.wines.map((wine: any) => ({
            ...wine,
            _id: typeof wine._id === 'string' ? { $oid: wine._id } : wine._id,
            timestamp: typeof wine.timestamp === 'string' ? { $date: wine.timestamp } : wine.timestamp,
          }));

          setWines(formattedWines);
          setHasMore(false);
          console.log('Fallback search successful');
        } catch (fallbackErr) {
          console.error('Fallback search failed:', fallbackErr);
          setError('Fehler bei der Suche. Versuche es erneut.');
          setWines(mockWines);
        }

        setTimeout(restoreScrollPosition, 100);
      } finally {
        setIsSearching(false);
      }
    },
    [apiUrl, restoreScrollPosition]
  );

  // Debounced search function
  const debouncedSearch = useCallback(
    (searchParams: typeof filters) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchParams);
      }, 300);
    },
    [performSearch]
  );

  // Initial load and filter changes
  useEffect(() => {
    debouncedSearch(filters);
  }, [filters, refreshTrigger, debouncedSearch]);

  // Scroll-Listener nur auf Hauptscreen
  useEffect(() => {
    if (!selectedWineId && !editingWineId) {
      isMainScreenRef.current = true;
      window.addEventListener('scroll', saveScrollPosition, { passive: true });
      return () => {
        window.removeEventListener('scroll', saveScrollPosition);
      };
    } else {
      isMainScreenRef.current = false;
    }
  }, [selectedWineId, editingWineId, saveScrollPosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleEdit = (wineId: Wine['_id']) => {
    saveScrollPosition();
    setEditingWineId(wineId.$oid);
  };

  const handleViewDetails = (wineId: Wine['_id']) => {
    saveScrollPosition();
    setSelectedWineId(wineId.$oid);
  };

  const handleEditBack = (refresh: boolean = false) => {
    setEditingWineId(null);
    hasRestoredRef.current = false;
    if (refresh) {
      setRefreshTrigger(prev => prev + 1);
    } else {
      setTimeout(restoreScrollPosition, 50);
    }
  };

  const handleDetailBack = () => {
    setSelectedWineId(null);
    hasRestoredRef.current = false;
    setTimeout(restoreScrollPosition, 50);
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (error) return <div className="p-4 text-red-500">Fehler: {error}</div>;

  if (editingWineId) {
    return (
      <EditWineScreen
        wineId={editingWineId}
        onBack={handleEditBack}
        apiUrl={apiUrl}
      />
    );
  }

  if (selectedWineId) {
    return (
      <WineDetailScreen
        wineId={selectedWineId}
        onBack={handleDetailBack}
        apiUrl={apiUrl}
      />
    );
  }

  return (
    <div className="App relative">
      <header className="glass-header">
        <h1 className="header-title">Wein Datenbank</h1>
        <span className="header-back" onClick={onBack}>
          Zurück
        </span>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-6 overflow-y-auto">
        <section className="glass-card w-full max-w-3xl">
          <h2 className="text-lg md:text-xl font-semibold mb-4" onClick={() => setFilterOpen(!filterOpen)}>
            Filter & Suche {filterOpen ? '▲' : '▼'}
          </h2>
          {filterOpen && (
            <div className="flex flex-col gap-4 mb-4">
              <div className="relative">
                <input
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Suche nach Namen, Rebsorte, Notizen... (z.B. 'Vina' findet auch 'Viña')"
                  className="w-full p-2 pr-8 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
                />
                {isSearching && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#baddff] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <select
                value={filters.farbe}
                onChange={(e) => handleFilterChange('farbe', e.target.value)}
                className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
              >
                <option value="">Alle Farben</option>
                <option value="Rot">Rot</option>
                <option value="Weiß">Weiß</option>
                <option value="Rosé">Rosé</option>
              </select>
              <select
                value={filters.kauforte}
                onChange={(e) => handleFilterChange('kauforte', e.target.value)}
                className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
              >
                <option value="">Alle Kauforte</option>
                <option value="Rewe">Rewe</option>
                <option value="Kaufland">Kaufland</option>
                <option value="Hit">Hit</option>
                <option value="Aldi">Aldi</option>
                <option value="Lidl">Lidl</option>
                <option value="Edeka">Edeka</option>
                <option value="Henkell">Henkell</option>
                <option value="Wo anders">Wo anders</option>
              </select>
              <select
                value={filters.kategorie}
                onChange={(e) => handleFilterChange('kategorie', e.target.value)}
                className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
              >
                <option value="">Alle Kategorien</option>
                <option value="Evergreen">Evergreen</option>
                <option value="Kochwein">Kochwein</option>
                <option value="Seltene Weine">Seltene Weine</option>
                <option value="Weinstand">Weinstand</option>
              </select>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 w-full max-w-3xl">
          {wines.length === 0 && !isSearching && (
            <div className="glass-card p-4 text-center">
              <p className="text-[#496580]">
                {filters.search ? 'Keine Ergebnisse gefunden.' : 'Keine Weine in der Datenbank.'}
              </p>
            </div>
          )}

          {wines.map((wine) => (
            <div
              key={wine._id.$oid}
              className="glass-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer wine-entry wine-entry-editable"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-200 rounded-lg flex-shrink-0 mr-4">
                {wine.imageUrl && (
                  <img
                    src={wine.imageUrl}
                    alt={wine.name}
                    className="w-full h-full object-contain rounded-lg cursor-pointer"
                    onClick={() => setSelectedImage(prev => (prev === wine.imageUrl ? null : wine.imageUrl || null))}
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {wine.name}
                      {wine.score && (
                        <span className="text-xs text-[#baddff] ml-2">
                          ({Math.round(wine.score * 100) / 100})
                        </span>
                      )}
                    </h3>
                    <p className="text-right">Sorte: {wine.rebsorte || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p>Kategorie: {wine.kategorie || 'N/A'}</p>
                    <p>Unterkategorie: {wine.unterkategorie || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between mt-2">
                  <p>Farbe: {wine.farbe || 'N/A'}</p>
                  <p>Preis: {wine.preis || 'N/A'}</p>
                  <p>Bewertung: {wine.bewertung || 0}/5</p>
                </div>
              </div>
              <svg
                onClick={() => handleEdit(wine._id)}
                className="edit-icon"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#496580"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <svg
                onClick={() => handleViewDetails(wine._id)}
                className="view-icon"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#496580"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          ))}

          {hasMore && (
            <div className="glass-card p-4 text-center">
              <p className="text-[#496580] text-sm">
                Weitere Ergebnisse verfügbar. Verfeinere deine Suche für präzisere Ergebnisse.
              </p>
            </div>
          )}
        </section>
      </main>
      <footer className="footer relative z-10">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
      {selectedImage &&
        ReactDOM.createPortal(
          <div
            className="image-overlay"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt="Vergrößerte Ansicht"
              onClick={(e) => e.stopPropagation()}
            />
            <span
              className="close-button"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </span>
          </div>,
          document.getElementById('image-portal-root') as HTMLElement
        )}
    </div>
  );
};

export default WineDBScreen;