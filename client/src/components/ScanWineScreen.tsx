import React, { useState } from 'react';
import axios from 'axios';
import { pipeline, RawImage } from '@xenova/transformers';
import '../App.css';

// Typ für Wein-Daten
interface Wine {
  _id: string;
  name: string;
  imageUrl?: string;
  ImageEmbedding: number[];
  similarity?: number;
  [key: string]: any;
}

// Props-Schnittstelle
interface ScanWineScreenProps {
  onBack: () => void;
  apiUrl: string;
}

const ScanWineScreen: React.FC<ScanWineScreenProps> = ({ onBack, apiUrl }) => {
  const [results, setResults] = useState<Wine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cosinus-Ähnlichkeit
  const cosineSimilarity = (a: number[], b: number[]): number => {
    const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0));
    const normB = Math.sqrt(b.reduce((sum, x) => sum + x * x, 0));
    return dot / (normA * normB);
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

      console.log('🚀 Lade CLIP Modell...');
      setIsProcessing(true);
      const extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
      console.log('✅ Modell geladen');

      // Bild in Data-URL konvertieren und in <img> laden
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Bildgröße reduzieren (für Performance)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas-Kontext nicht verfügbar');
      }
      canvas.width = 256;
      canvas.height = 256;
      ctx.drawImage(img, 0, 0, 256, 256);
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Bild mit RawImage verarbeiten
      const image = await RawImage.fromURL(resizedDataUrl);
      const imageEmbedding = await extractor(image);
      const queryEmbedding = Array.from(imageEmbedding.data) as number[];

      // Weine mit Embeddings holen - mit verbessertem Error Handling
      console.log('Lade Weine von Server...', { apiUrl, url: `${apiUrl}/wines?hasEmbedding=true` });
      
      // Füge einen Health Check hinzu
      try {
        console.log('Teste Server Health...');
        const healthResponse = await axios.get(`${apiUrl}/health`, {
          timeout: 10000, // 10 Sekunden Timeout
          headers: { Accept: 'application/json' }
        });
        console.log('Health Check OK:', healthResponse.data);
      } catch (healthError) {
        console.error('Health Check fehlgeschlagen:', healthError);
      }

      console.log('Verwendete apiUrl:', apiUrl);
      console.log('Sende Anfrage an:', `${apiUrl}/wines`, {
        params: { hasEmbedding: true },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const response = await axios.get<Wine[]>(`${apiUrl}/wines`, {
        params: { hasEmbedding: true },
        headers: { 
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30 Sekunden Timeout
        validateStatus: status => status >= 200 && status < 300,
      }).catch(err => {
        console.error('Vollständiger Axios Fehler:', {
          message: err.message,
          response: err.response,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          headers: err.response?.headers,
          config: err.config
        });
        
        // Prüfe ob die Antwort HTML ist
        if (err.response?.data && typeof err.response.data === 'string' && err.response.data.includes('<!doctype')) {
          throw new Error(`Server antwortet mit HTML statt JSON. Status: ${err.response.status}. Möglicherweise ist der Server überlastet oder schläft.`);
        }
        
        throw new Error(`Axios Fehler: ${err.message}, Status: ${err.response?.status || 'unbekannt'}`);
      });

      console.log('Response Headers:', response.headers);
      console.log('Response Status:', response.status);
      console.log('Response Data Type:', typeof response.data);

      if (!Array.isArray(response.data)) {
        throw new Error('Server-Antwort ist kein Array');
      }

      const wines = response.data.filter(wine => wine.ImageEmbedding && Array.isArray(wine.ImageEmbedding));
      console.log('Geladene Weine:', wines.length);

      if (wines.length === 0) {
        setError('Keine Weine mit Embeddings gefunden');
        setIsProcessing(false);
        return;
      }

      // Cosinus-Ähnlichkeit berechnen
      const results = wines
        .map(wine => ({
          ...wine,
          similarity: cosineSimilarity(queryEmbedding, wine.ImageEmbedding)
        }))
        .filter(wine => wine.similarity > 0.5)
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, 10);

      console.log('Suchergebnisse:', { count: results.length, results });

      setResults(results);
      setError(null);
      setIsProcessing(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler bei der Bildsuche:', errorMessage);
      setError(`Fehler bei der Bildsuche: ${errorMessage}`);
      setIsProcessing(false);
    } finally {
      setIsUploading(false);
    }
  };

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
          {isUploading || isProcessing ? (
            <div className="loader">
              <p className="text-sm text-gray-600 mt-2">
                {isUploading && !isProcessing && 'Bild wird hochgeladen...'}
                {isProcessing && 'Modell wird geladen und Bild verarbeitet...'}
              </p>
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
            <div className="text-red-600 mt-4 p-3 bg-red-50 rounded">
              <p className="font-semibold">Fehler:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </section>
        {results.length > 0 && (
          <section className="glass-card bg-white bg-opacity-80 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">Ergebnisse</h2>
            <ul className="space-y-4">
              {results.map(wine => (
                <li key={wine._id} className="flex items-center gap-4">
                  {wine.imageUrl && (
                    <img src={wine.imageUrl} alt={wine.name} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div>
                    <p className="font-medium">{wine.name}</p>
                    <p className="text-sm text-gray-600">
                      Ähnlichkeit: {(wine.similarity! * 100).toFixed(2)}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <footer className="footer p-4 text-center">
        <p className="text-sm text-gray-600">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default ScanWineScreen;