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
  const [wine, setWine]           = useState<Wine | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.REACT_APP_USE_MOCK_DATA === 'true') {
      const found = mockWines.find((w: Wine) => w._id.$oid === wineId);
      setWine(found || null);
      if (!found) setError('Wein nicht gefunden');
      setLoading(false);
    } else {
      axios.get(`${apiUrl}/wine/${wineId}`)
        .then(res => { setWine(res.data as Wine); setLoading(false); })
        .catch(() => { setError('Fehler beim Laden der Weindaten'); setLoading(false); });
    }
  }, [wineId, apiUrl]);

  if (loading) return <div className="loader" style={{ marginTop:'4rem' }} />;
  if (error)   return <div className="snackbar error">{error}</div>;
  if (!wine)   return <div className="snackbar error">Wein nicht gefunden</div>;

  /* Detail row helper */
  const Row = ({ label, value }: { label: string; value?: string }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline',
                  borderBottom:'1px solid var(--color-glass-border)', paddingBottom:'0.5rem',
                  marginBottom:'0.5rem' }}>
      <span style={{ fontSize:'0.7rem', letterSpacing:'0.18em', textTransform:'uppercase',
                     color:'var(--color-accent)', fontFamily:'DM Sans, sans-serif', fontWeight:500 }}>
        {label}
      </span>
      <span style={{ color:'var(--color-text-primary)', fontFamily:'DM Sans, sans-serif', fontSize:'0.9rem' }}>
        {value || 'N/A'}
      </span>
    </div>
  );

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein Details</h1>
        <span className="header-back" onClick={onBack}>Zurück</span>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center gap-6">

        {/* ── Bild ── */}
        <section className="glass-card image-upload">
          <h2>Bild</h2>
          {wine.imageUrl ? (
            <img src={wine.imageUrl} alt={wine.name} className="image-preview"
              style={{ cursor:'pointer' }}
              onClick={() => setSelectedImage(wine.imageUrl || null)} />
          ) : (
            <div style={{
              width:'100%', height:120, background:'var(--color-glass-bg)',
              border:'1px dashed var(--color-glass-border)', borderRadius:6,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <span style={{ color:'var(--color-text-muted)', fontFamily:'DM Sans,sans-serif', fontSize:'0.85rem' }}>
                Kein Bild verfügbar
              </span>
            </div>
          )}
        </section>

        {/* ── Wein Details ── */}
        <section className="glass-card">
          <h2>Wein Details</h2>
          <Row label="Name"       value={wine.name} />
          <Row label="Sorte"      value={wine.rebsorte} />
          <Row label="Farbe"      value={wine.farbe} />
          <Row label="Preis"      value={wine.preis} />
          <Row label="Gekauft bei" value={wine.kauforte?.join(', ')} />
        </section>

        {/* ── Kategorie ── */}
        <section className="glass-card">
          <h2>Kategorie</h2>
          <Row label="Kategorie"      value={wine.kategorie} />
          <Row label="Unterkategorie" value={wine.unterkategorie} />
        </section>

        {/* ── Saison ── */}
        {wine.saison && (
          <section className="glass-card">
            <h2>Saison</h2>
            <p style={{ color:'var(--color-text-secondary)', fontFamily:'DM Sans,sans-serif' }}>
              {wine.saison}
            </p>
          </section>
        )}

        {/* ── Geschmack ── */}
        <section className="glass-card">
          <h2>Geschmack</h2>
          {wine.geschmack?.length ? (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginTop:'0.25rem' }}>
              {wine.geschmack.map(g => (
                <span key={g} style={{
                  fontFamily:'DM Sans,sans-serif', fontSize:'0.78rem', letterSpacing:'0.08em',
                  border:'1px solid var(--color-glass-border)',
                  background:'var(--color-accent-dim)',
                  color:'var(--color-accent)',
                  padding:'3px 12px', borderRadius:3,
                }}>{g}</span>
              ))}
            </div>
          ) : (
            <span style={{ color:'var(--color-text-muted)', fontFamily:'DM Sans,sans-serif', fontSize:'0.85rem' }}>
              Keine Geschmacksmerkmale
            </span>
          )}
        </section>

        {/* ── Bewertung ── */}
        <section className="glass-card bewertung-card">
          <h2>Bewertung</h2>
          <div className="flex flex-row gap-2 flex-nowrap">
            {[1,2,3,4,5].map(star => (
              <svg key={star} style={{
                width:32, height:32, flexShrink:0,
                fill:   star <= (wine.bewertung || 0) ? 'var(--color-star-active)' : 'none',
                stroke: star <= (wine.bewertung || 0) ? 'var(--color-star-active)' : 'var(--color-star-inactive)',
                strokeWidth: 1.5,
              }} viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </section>

        {/* ── Notizen ── */}
        <section className="glass-card">
          <h2>Notizen</h2>
          <p style={{ color: wine.notizen ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                      fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', lineHeight:1.7 }}>
            {wine.notizen || 'Keine Notizen'}
          </p>
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

export default WineDetailScreen;