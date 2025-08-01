import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../App.css';

// Typ für Wein-Daten
interface Wine {
  _id: string;
  name: string;
  imageUrl?: string;
  similarity: number;
  [key: string]: any; // Für zusätzliche Felder
}

// Props-Schnittstelle
interface ScanWineScreenProps {
  onBack: () => void;
  apiUrl: string;
}

const ScanWineScreen: React.FC<ScanWineScreenProps> = ({ onBack, apiUrl }) => {
  const [results, setResults] = useState<Wine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Rückkamera bevorzugen
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        setError(null);
        console.log('Kamera gestartet');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler beim Starten der Kamera:', errorMessage);
      setError('Kamera konnte nicht gestartet werden. Bitte überprüfen Sie die Berechtigungen.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
      console.log('Kamera gestoppt');
    }
  };

  const captureImage = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video oder Canvas nicht verfügbar');
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas-Kontext nicht verfügbar');
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      const formData = new FormData();
      const blob = await (await fetch(imageData)).blob();
      formData.append('image', blob, 'captured-image.jpg');

      console.log('Sende Bild an Server...');
      const response = await axios.post<{ wines: Wine[]; totalCount: number; hasMore: boolean }>(
        `${apiUrl}/search/image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setResults(response.data.wines);
      setError(null);
      stopCamera();
      console.log('Suchergebnisse:', response.data.wines);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler bei der Bildsuche:', errorMessage);
      setError(`Fehler bei der Bildsuche: ${errorMessage}`);
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
        <section className="glass-card bg-white bg-opacity-80 rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">Etikett scannen</h2>
          <div className="glass-card-content">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="btn-primary w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Kamera starten
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg"
                  autoPlay
                  playsInline
                />
                <button
                  onClick={captureImage}
                  className="btn-primary w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Bild aufnehmen
                </button>
                <button
                  onClick={stopCamera}
                  className="btn-primary w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Kamera stoppen
                </button>
              </div>
            )}
            {error && <p className="text-red-600 mt-4">{error}</p>}
          </div>
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