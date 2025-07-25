import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { mockWines } from '../mocks/mockWines';
import { Wine } from '../types/Wine';
import '../App.css';

interface WineDetailScreenProps {
  wineId: string;
  onBack: () => void;
  apiUrl: string;
}

const WineDetailScreen: React.FC<WineDetailScreenProps> = ({ wineId, onBack, apiUrl }) => {
  const [wine, setWine] = useState<Wine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';

    if (useMockData) {
      const mockWine = mockWines.find((w: Wine) => w._id.$oid === wineId);
      if (mockWine) {
        setWine(mockWine);
      } else {
        setError('Wein nicht gefunden');
      }
      setLoading(false);
    } else {
      axios.get(`${apiUrl}/wine/${wineId}`)
        .then(res => {
          const wineData = res.data as Wine;
          setWine(wineData);
          setLoading(false);
        })
        .catch(err => {
          setError('Fehler beim Laden der Weindaten');
          setLoading(false);
        });
    }
  }, [wineId, apiUrl]);

  if (loading) return <div className="loader"></div>;
  if (error) return <div className="snackbar error">{error}</div>;
  if (!wine) return <div className="snackbar error">Wein nicht gefunden</div>;

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein Details</h1>
        <span className="header-back" onClick={onBack}>Zurück</span>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-6">
        <section className="glass-card image-upload">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Bild</h2>
          {wine.imageUrl ? (
            <img
              src={wine.imageUrl}
              alt={wine.name}
              className="image-preview"
              onClick={() => setSelectedImage(wine.imageUrl || null)}
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-muted">Kein Bild verfügbar</span>
            </div>
          )}
        </section>
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Wein Details</h2>
          <div className="flex flex-col gap-2">
            <p><strong>Name:</strong> {wine.name || 'N/A'}</p>
            <p><strong>Sorte:</strong> {wine.rebsorte || 'N/A'}</p>
            <p><strong>Farbe:</strong> {wine.farbe || 'N/A'}</p>
            <p><strong>Preis:</strong> {wine.preis || 'N/A'}</p>
            <p><strong>Gekauft bei:</strong> {wine.kauforte?.join(', ') || 'N/A'}</p>
          </div>
        </section>
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Kategorie</h2>
          <div className="flex flex-col gap-2">
            <p><strong>Kategorie:</strong> {wine.kategorie || 'N/A'}</p>
            <p><strong>Unterkategorie:</strong> {wine.unterkategorie || 'N/A'}</p>
          </div>
        </section>
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Geschmack</h2>
          {wine.geschmack?.length ? (
            <ul className="list-disc list-inside gap-2 text-[#496580]">
              {wine.geschmack.map((g) => (
                <li key={g} className="text-sm">{g}</li>
              ))}
            </ul>
          ) : (
            <span className="text-muted">Keine Geschmacksmerkmale</span>
          )}
        </section>
        <section className="glass-card bewertung-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Bewertung</h2>
          <div className="flex flex-row gap-2 flex-nowrap">
            {[1, 2, 3, 4, 5].map(star => (
              <svg
                key={star}
                className="w-4 h-4 flex-shrink-0"
                style={{ fill: star <= (wine.bewertung || 0) ? '#baddff' : 'none', stroke: star <= (wine.bewertung || 0) ? '#baddff' : '#496580', strokeWidth: 2 }}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </section>
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Notizen</h2>
          <p>{wine.notizen || 'Keine Notizen'}</p>
        </section>
      </main>
      <footer className="footer">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
      {selectedImage &&
        ReactDOM.createPortal(
          <div className="image-overlay" onClick={() => setSelectedImage(null)}>
            <img src={selectedImage} alt="Vergrößerte Ansicht" onClick={(e) => e.stopPropagation()} />
            <span className="close-button" onClick={() => setSelectedImage(null)}>×</span>
          </div>,
          document.getElementById('image-portal-root') as HTMLElement
        )}
      {error && <div className="snackbar error">{error}</div>}
    </div>
  );
};

export default WineDetailScreen;