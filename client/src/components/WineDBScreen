import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Wine {
  _id: string;
  name: string;
  rebsorte?: string;
  farbe?: string;
  preis?: string;
  kategorie?: string;
  unterkategorie?: string;
  bewertung?: number;
  imageUrl?: string;
  timestamp: string;
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

  useEffect(() => {
    axios.get(`${apiUrl}/wines`).then((res) => setWines(res.data)).catch((err) => console.error('Fehler:', err));
  }, [apiUrl]);

  const filteredWines = wines.filter(wine => 
    (wine.name.toLowerCase().includes(filters.search.toLowerCase()) || 
     (wine.rebsorte && wine.rebsorte.toLowerCase().includes(filters.search.toLowerCase()))) &&
    (!filters.farbe || wine.farbe === filters.farbe) &&
    (!filters.preis || wine.preis === filters.preis) &&
    (!filters.kategorie || wine.kategorie === filters.kategorie)
  );

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein Datenbank</h1>
        <span className="header-back" onClick={onBack}>Zurück</span>
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
                <option value="">Farbe auswählen</option>
                <option value="Rot">Rot</option>
                <option value="Weiß">Weiß</option>
                <option value="Rosé">Rosé</option>
              </select>
              <select
                value={filters.preis}
                onChange={(e) => setFilters({ ...filters, preis: e.target.value })}
                className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
              >
                <option value="">Preis auswählen</option>
                <option value="unter_5">{'<5 €'}</option>
                <option value="5_8">5-8 €</option>
                <option value="8_12">8-12 €</option>
                <option value="12_15">12-15 €</option>
                <option value="ueber_15">{'>15 €'}</option>
              </select>
              <select
                value={filters.kategorie}
                onChange={(e) => setFilters({ ...filters, kategorie: e.target.value })}
                className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]"
              >
                <option value="">Kategorie auswählen</option>
                <option value="Evergreen">Evergreen</option>
                <option value="Kochwein">Kochwein</option>
                <option value="Seltene Weine">Seltene Weine</option>
                <option value="Weinstand">Weinstand</option>
              </select>
            </div>
          )}
        </section>
        <section className="flex flex-col gap-4 w-full max-w-3xl">
          {filteredWines.map(wine => (
            <div
              key={wine._id}
              className="glass-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer wine-entry"
              onClick={() => {}}
            >
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 mr-4">
                {wine.imageUrl && <img src={wine.imageUrl} alt={wine.name} className="w-full h-full object-cover rounded-lg" />}
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{wine.name}</h3>
                    <p className="text-muted">Sorte: {wine.rebsorte || 'N/A'}</p>
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
            </div>
          ))}
        </section>
      </main>
      <footer className="footer">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default WineDBScreen;