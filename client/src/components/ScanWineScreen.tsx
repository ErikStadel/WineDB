import React, { useState } from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import WineDetailScreen from './WineDetailScreen';
import EditWineScreen from './EditWineScreen';
import '../App.css';

interface Wine {
  _id: string; name: string; imageUrl?: string; similarity: number;
  rebsorte?: string; farbe?: string; preis?: string;
  kategorie?: string; unterkategorie?: string; bewertung?: number;
  [key: string]: any;
}

interface ScanWineScreenProps {
  onBack: () => void;
  apiUrl: string;
}

const ScanWineScreen: React.FC<ScanWineScreenProps> = ({ onBack, apiUrl }) => {
  const [results, setResults] = useState<Wine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null);
  const [editingWineId, setEditingWineId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const compressImage = (file: File): Promise<File> =>
    new Promise(resolve => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = e => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          const maxSize = 1024;
          let [w, h] = [img.width, img.height];
          if (w > h ? w > maxSize : h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => resolve(
            blob ? new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }) : file
          ), 'image/jpeg', 0.8);
        };
      };
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) { setError('Kein Bild ausgewählt'); return; }

      setIsUploading(true); setError(null);
      setUploadStatus('Bild wird komprimiert…');

      const compressed = await compressImage(file);
      setUploadStatus('Bild wird hochgeladen…');

      const formData = new FormData();
      formData.append('image', compressed);

      const imgbbResponse = await axios.post(
        'https://api.imgbb.com/1/upload', formData,
        {
          params: { key: process.env.REACT_APP_IMGBB_API_KEY },
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      const imageUrl = imgbbResponse.data.data.url;

      setUploadStatus('KI analysiert das Bild…');
      let retryCount = 0;

      while (retryCount <= 2) {
        try {
          const response = await axios.post<{ wines: Wine[]; totalCount: number; hasMore: boolean }>(
            'https://cloud-job-608509602627.europe-west3.run.app/imageSearch',
            { imageUrl },
            { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
          );
          setResults(response.data.wines);
          setError(null); setUploadStatus('');
          break;
        } catch (err: any) {
          if (err.response?.status === 503 && retryCount < 2) {
            retryCount++;
            setUploadStatus(`KI-Modelle werden geladen… (Versuch ${retryCount}/2)`);
            await new Promise(r => setTimeout(r, 10000));
          } else throw err;
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Unbekannter Fehler';
      if (err.code === 'ECONNABORTED')
        setError('Timeout: Die Bildanalyse dauert zu lange. Bitte versuche es erneut.');
      else if (err.response?.status === 503)
        setError('Die KI-Dienste starten gerade. Bitte warte 30 Sekunden und versuche es erneut.');
      else setError(`Fehler bei der Bildsuche: ${msg}`);
      setUploadStatus('');
    } finally { setIsUploading(false); }
  };

  const handleEditBack = (refresh = false) => {
    setEditingWineId(null);
    if (refresh) setResults([]);
  };

  if (editingWineId)
    return <EditWineScreen wineId={editingWineId} onBack={handleEditBack} apiUrl={apiUrl} />;
  if (selectedWineId)
    return <WineDetailScreen wineId={selectedWineId} onBack={() => setSelectedWineId(null)} apiUrl={apiUrl} />;

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein Scanner</h1>
        <span className="header-back" onClick={onBack}>Zurück</span>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center gap-6">

        {/* ── Upload ── */}
        <section className="glass-card image-upload">
          <h2>Wein Scannen</h2>
          {isUploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className="loader" />
              {uploadStatus && (
                <p style={{
                  fontSize: '0.85rem', color: 'var(--color-text-secondary)',
                  fontFamily: 'DM Sans,sans-serif', textAlign: 'center'
                }}>
                  {uploadStatus}
                </p>
              )}
            </div>
          ) : (
            <label className="upload-plus">
              <span className="plus-symbol">+</span>
              <input type="file" accept="image/*" className="hidden-input" onChange={handleImageUpload} />
            </label>
          )}

          {error && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'var(--color-error)', borderRadius: 4,
              border: '1px solid rgba(200,80,80,0.35)',
            }}>
              <p style={{
                color: 'var(--color-text-primary)', fontSize: '0.85rem',
                fontFamily: 'DM Sans,sans-serif'
              }}>{error}</p>
            </div>
          )}
        </section>

        {/* ── Results ── */}
        {results.length > 0 && (
          <section className="flex flex-col gap-4 w-full max-w-3xl">
            <h2 style={{ marginBottom: '0.5rem' }}>Ergebnisse</h2>
            {results.map(wine => (
              <div key={wine._id}
                className="glass-card wine-entry"
                style={{
                  padding: '1.1rem 1.1rem 1.1rem 0', display: 'flex',
                  gap: 0, alignItems: 'stretch', overflow: 'hidden'
                }}>

                {/* ① Colour stripe */}
                <div style={{
                  width: 4, flexShrink: 0, borderRadius: '6px 0 0 6px',
                  background: wine.farbe === 'Rot' ? 'var(--color-wine-red)'
                    : wine.farbe === 'Rosé' ? 'var(--color-wine-rose)'
                      : 'var(--color-wine-white)',
                  marginRight: '0.9rem',
                }} />

                {/* ② Thumbnail */}
                <div style={{
                  width: 64, height: 64, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2,
                  background: 'var(--color-glass-bg)',
                  border: '1px solid var(--color-glass-border)',
                  borderRadius: 4, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {wine.imageUrl && (
                    <img src={wine.imageUrl} alt={wine.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => setSelectedImage(prev => prev === wine.imageUrl ? null : wine.imageUrl || null)}
                    />
                  )}
                </div>

                {/* ③ Main info */}
                <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>

                  {/* Row 1: Name + Similarity */}
                  <h3 style={{
                    fontFamily: 'Cormorant Garamond,serif', fontSize: '1.15rem', fontWeight: 500,
                    color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.25
                  }}>
                    {wine.name}
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)', marginLeft: 6, opacity: 0.6 }}>
                      ({(wine.similarity * 100).toFixed(1)}%)
                    </span>
                  </h3>

                  {/* Row 2: Rebsorte · Farbe */}
                  <p style={{
                    fontSize: '0.72rem', color: 'var(--color-accent)',
                    letterSpacing: '0.06em', margin: 0
                  }}>
                    {wine.rebsorte || 'N/A'} · {wine.farbe || 'N/A'}
                  </p>

                  {/* Row 3: Kategorie · Unterkategorie */}
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    {wine.kategorie || 'N/A'}
                    {wine.unterkategorie && (
                      <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>
                        · {wine.unterkategorie}
                      </span>
                    )}
                  </p>

                  {/* Row 4: Preis + Sterne */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: '0.2rem'
                  }}>
                    <span style={{
                      fontSize: '0.85rem', color: 'var(--color-text-primary)',
                      fontFamily: 'DM Sans, sans-serif'
                    }}>
                      {wine.preis || 'N/A'}
                    </span>
                    <span style={{ fontSize: '1rem', letterSpacing: 2 }}>
                      <span style={{ color: 'var(--color-star-active)' }}>
                        {'★'.repeat(wine.bewertung || 0)}
                      </span>
                      <span style={{ color: 'var(--color-star-inactive)' }}>
                        {'★'.repeat(5 - (wine.bewertung || 0))}
                      </span>
                    </span>
                  </div>
                </div>

                {/* ④ Icon column */}
                <div style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  alignItems: 'center', paddingLeft: '0.75rem',
                  flexShrink: 0, width: 28
                }}>
                  <svg onClick={() => setEditingWineId(wine._id)}
                    style={{ cursor: 'pointer', opacity: 0.55, transition: 'opacity 0.2s' }}
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <svg onClick={() => setSelectedWineId(wine._id)}
                    style={{ cursor: 'pointer', opacity: 0.55, transition: 'opacity 0.2s' }}
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>

              </div>
            ))}
          </section>
        )}
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

export default ScanWineScreen;