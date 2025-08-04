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
  apiUrl: string;
}

const ScanWineScreen: React.FC<ScanWineScreenProps> = ({ onBack, apiUrl }) => {
  const [results, setResults] = useState<Wine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

      console.log('API-Schlüssel:', process.env.REACT_APP_IMGBB_API_KEY); // Debugging
      console.log('Datei:', file.name, file.size, file.type); // Debugging

      const compressedFile = await compressImage(file);
      console.log('Komprimierte Datei:', compressedFile.name, compressedFile.size, compressedFile.type); // Debugging

      const formData = new FormData();
      formData.append('image', compressedFile);
      console.log('FormData:', Array.from(formData.entries())); // Debugging

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

      const response = await axios.post<{ wines: Wine[]; totalCount: number; hasMore: boolean }>(
        `${apiUrl}/searchImage`,
        { imageUrl },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      setResults(response.data.wines);
      setError(null);
      console.log('Suchergebnisse:', response.data.wines);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Unbekannter Fehler';
      console.error('Fehler bei der Bildsuche:', errorMessage, err.response?.data); // Verbessertes Debugging
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
                accept="image/*"
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