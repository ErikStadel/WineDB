import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { mockWines } from '../mocks/mockWines';
import EditWineScreen from './EditWineScreen';

interface Wine {
  _id: {
    $oid: string;
  };
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
  timestamp: {
    $date: string;
  };
}

const WineDBScreen: React.FC<{ onBack: () => void; apiUrl: string }> = ({ onBack, apiUrl }) => {
  const [wines, setWines] = useState<Wine[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    farbe: '',
    preis: '',
    kategorie: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingWineId, setEditingWineId] = useState<string | null>(null);

  useEffect(() => {
    const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';
    
    if (useMockData) {
      setWines(mockWines);
    } else {
      axios.get(`${apiUrl}/wines`)
        .then((res) => {
          // Stelle sicher, dass die Daten das richtige Format haben
          const formattedWines = res.data.map((wine: any) => ({
            ...wine,
            _id: typeof wine._id === 'string' 
              ? { $oid: wine._id }
              : wine._id,
            timestamp: typeof wine.timestamp === 'string'
              ? { $date: wine.timestamp }
              : wine.timestamp
          }));
          setWines(formattedWines);
        })
        .catch((err) => {
          console.error('Fehler:', err);
          setWines(mockWines);
        });
    }
  }, [apiUrl]);

  const handleEdit = (wineId: Wine['_id']) => {
    console.log('Edit clicked with ID:', wineId.$oid); // Debug-Ausgabe
    setEditingWineId(wineId.$oid);
  };

  const filteredWines = wines.filter((wine) => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch =
      wine.name.toLowerCase().includes(searchLower) ||
      (wine.rebsorte && wine.rebsorte.toLowerCase().includes(searchLower)) ||
      (wine.farbe && wine.farbe.toLowerCase().includes(searchLower)) ||
      (wine.preis && wine.preis.toLowerCase().includes(searchLower)) ||
      (wine.kategorie && wine.kategorie.toLowerCase().includes(searchLower)) ||
      (wine.unterkategorie && wine.unterkategorie.toLowerCase().includes(searchLower)) ||
      (wine.bewertung && wine.bewertung.toString().includes(searchLower));

    return (
      matchesSearch &&
      (!filters.farbe || wine.farbe === filters.farbe) &&
      (!filters.preis || wine.preis === filters.preis) &&
      (!filters.kategorie || wine.kategorie === filters.kategorie)
    );
  });

  if (editingWineId) {
    return (
      <EditWineScreen 
        wineId={editingWineId} 
        onBack={() => setEditingWineId(null)}
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
            Filter {filterOpen ? '▲' : '▼'}
          </h2>
          {filterOpen && (
            <div className="flex flex-col gap-4 mb-4">
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Suche..."
                className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
              />
              <select
                value={filters.farbe}
                onChange={(e) => setFilters({ ...filters, farbe: e.target.value })}
                className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
              >
                <option value="">Alle Farben</option>
                <option value="Rot">Rot</option>
                <option value="Weiß">Weiß</option>
                <option value="Rosé">Rosé</option>
              </select>
              <select
                value={filters.preis}
                onChange={(e) => setFilters({ ...filters, preis: e.target.value })}
                className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
              >
                <option value="">Alle Preise</option>
                <option value="unter 5 €">{'<5 €'}</option>
                <option value="5-8 €">5-8 €</option>
                <option value="8-12 €">8-12 €</option>
                <option value="12-15 €">12-15 €</option>
                <option value="ueber 15 €">{'>15 €'}</option>
              </select>
              <select
                value={filters.kategorie}
                onChange={(e) => setFilters({ ...filters, kategorie: e.target.value })}
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
          {filteredWines.map((wine) => (
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
                    <h3 className="text-lg font-semibold">{wine.name}</h3>
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
            </div>
          ))}
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