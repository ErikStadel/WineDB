import React, { useState } from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import WineDetailScreen from './WineDetailScreen';
import EditWineScreen from './EditWineScreen';
import '../App.css';

interface Wine {
  _id: string;
  name: string;
  imageUrl?: string;
  similarity: number;
  rebsorte?: string;
  farbe?: string;
  preis?: string;
  kategorie?: string;
  unterkategorie?: string;
  bewertung?: number;
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
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          const maxSize = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) {
        setError('Kein Bild ausgewählt');
        return;
      }

      setIsUploading(true);
      setError(null);
      setUploadStatus('Bild wird komprimiert...');

      const compressedFile = await compressImage(file);
      console.log('Komprimierte Datei:', compressedFile.name, compressedFile.size, compressedFile.type);

      setUploadStatus('Bild wird hochgeladen...');
      const formData = new FormData();
      formData.append('image', compressedFile);

      const imgbbResponse = await axios.post(
        'https://api.imgbb.com/1/upload',
        formData,
        {
          params: { key: process.env.REACT_APP_IMGBB_API_KEY },
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      const imageUrl = imgbbResponse.data.data.url;
      console.log('Bild hochgeladen zu ImgBB:', imageUrl);

      setUploadStatus('KI analysiert das Bild...');
      
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          const response = await axios.post<{ wines: Wine[]; totalCount: number; hasMore: boolean }>(
            'https://cloud-job-608509602627.europe-west3.run.app/imageSearch',
            { imageUrl },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 60000, // 60 Sekunden Timeout (erhöht von 15s!)
            }
          );

          setResults(response.data.wines);
          setError(null);
          setUploadStatus('');
          console.log('Suchergebnisse:', response.data.wines);
          break; // Erfolg, Schleife verlassen
          
        } catch (err: any) {
          // 503 = Service Unavailable (Modelle laden noch)
          if (err.response?.status === 503 && retryCount < maxRetries) {
            retryCount++;
            console.log(`Dienst noch nicht bereit, Versuch ${retryCount}/${maxRetries}...`);
            setUploadStatus(`KI-Modelle werden geladen... (Versuch ${retryCount}/${maxRetries})`);
            // 10 Sekunden warten bevor Retry
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue;
          }
          
          // Alle anderen Fehler oder max Retries erreicht
          throw err;
        }
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Unbekannter Fehler';
      console.error('Fehler bei der Bildsuche:', errorMessage, err.response?.data);
      
      // Benutzerfreundliche Fehlermeldungen
      if (err.code === 'ECONNABORTED') {
        setError('Timeout: Die Bildanalyse dauert zu lange. Bitte versuche es erneut.');
      } else if (err.response?.status === 503) {
        setError('Die KI-Dienste starten gerade. Bitte warte 30 Sekunden und versuche es erneut.');
      } else {
        setError(`Fehler bei der Bildsuche: ${errorMessage}`);
      }
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (wineId: string) => {
    setEditingWineId(wineId);
  };

  const handleViewDetails = (wineId: string) => {
    setSelectedWineId(wineId);
  };

  const handleEditBack = (refresh: boolean = false) => {
    setEditingWineId(null);
    if (refresh) {
      setResults([]);
    }
  };

  const handleDetailBack = () => {
    setSelectedWineId(null);
  };

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
    <div className="App min-h-screen bg-gray-100 flex flex-col">
      <header className="glass-header p-4 flex justify-between items-center">
        <h1 className="header-title text-xl font-bold text-gray-800">Wein Scanner</h1>
        <span className="header-back text-blue-600 cursor-pointer" onClick={onBack}>
          Zurück
        </span>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-6">
        <section className="glass-card image-upload bg-white bg-opacity-80 rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">Wein Scannen</h2>
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="loader" />
              {uploadStatus && (
                <p className="text-sm text-gray-600 text-center">{uploadStatus}</p>
              )}
            </div>
          ) : (
            <label className="upload-plus flex items-center justify-center w-full h-32 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300 transition">
              <span className="plus-symbol text-4xl text-gray-600">+</span>
              <input
                id="library-input"
                type="file"
                accept="image/*"
                className="hidden-input hidden"
                onChange={handleImageUpload}
              />
            </label>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </section>
        {results.length > 0 && (
          <section className="flex flex-col gap-4 w-full max-w-3xl">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">Ergebnisse</h2>
            {results.map(wine => (
              <div
                key={wine._id}
                className="glass-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer wine-entry"
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
                        <span className="text-xs text-[#baddff] ml-2">
                          ({(wine.similarity * 100).toFixed(2)}%)
                        </span>
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
          </section>
        )}
      </main>
      <footer className="footer p-4 text-center">
        <p className="text-sm text-gray-600">Entwickelt mit Liebe zum Wein</p>
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

export default ScanWineScreen;