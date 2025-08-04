import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

interface Wine {
  _id: string;
  name: string;
  imageUrl?: string;
  similarity: number;
  [key: string]: any;
}

interface ScanWineScreenProps {
  onBack: () => void;
  apiUrl: string; // URL for the API endpoint
}

const ScanWineScreen: React.FC<ScanWineScreenProps> = ({ onBack, apiUrl }) => {
  const [results, setResults] = useState<Wine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  try {
    const file = event.target.files?.[0];
    if (!file) {
      setError('Kein Bild ausgewählt');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file); // Muss exakt 'image' sein, wie in cloud_job.js

    console.log('Sende Bild an Cloud Run...', file.name, file.size); // Debugging
    const response = await axios.post<{ wines: Wine[]; totalCount: number; hasMore: boolean }>(
      'https://cloud-job-608509602627.europe-west3.run.app/searchImage',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 10000, // 10s Timeout für iOS Safari
      }
    );

    setResults(response.data.wines);
    setError(null);
    console.log('Suchergebnisse:', response.data.wines);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
    console.error('Fehler bei der Bildsuche:', errorMessage);
    setError(`Fehler bei der Bildsuche: ${errorMessage}`);
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
          {isUploading ? (
            <div className="loader" />
          ) : (
            <label className="upload-plus flex items-center justify-center w-full h-32 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300 transition">
              <span className="plus-symbol text-4xl text-gray-600">+</span>
              <input
                id="library-input"
                type="file"
                accept="image/*" // Optimiert für iOS Safari
                className="hidden-input hidden"
                onChange={handleImageUpload}
              />
            </label>
          )}
          {error && <p className="text-red-600 mt-4">{error}</p>}
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
                      Ähnlichkeit: {(wine.similarity * 100).toFixed(2)}%
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