import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import AddWineScreen from './components/AddWineScreen';
import InspirationScreen from './components/InspirationScreen';

interface Wine {
  _id: string;
  name: string;
  hersteller: string;
  jahrgang: number;
  bewertung: number;
  timestamp: string;
  imageUrl?: string;
  rebsorte?: string;
  kauforte?: string[];
}

const App: React.FC = () => {
  const [wines, setWines] = useState<Wine[]>([]);
  const [showAddWine, setShowAddWine] = useState(false);
  const [showInspiration, setShowInspiration] = useState(false);

  const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://192.168.0.208:3001';

  useEffect(() => {
    axios.get(`${apiUrl}/wines`).then((res) => setWines(res.data)).catch((err) => console.error('Fehler:', err));
  }, []);

  if (showAddWine) return <AddWineScreen onBack={() => setShowAddWine(false)} apiUrl={apiUrl} />;
  if (showInspiration) return <InspirationScreen onBack={() => setShowInspiration(false)} />;

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="text-xl md:text-2xl font-semibold text-white !text-[#ffffff] text-center">Wein Bewertung</h1>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-12">
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold text-[#baddff] mb-4">Willkommen</h2>
          <div className="space-y-3">
            <button className="btn-primary text-base font-medium mt-4" onClick={() => setShowAddWine(true)}>Wein hinzufügen</button>
            <button className="btn-secondary text-base font-medium mt-4" onClick={() => alert('Datenbank geöffnet')}>Datenbank</button>
            <button className="btn-outline text-base font-medium mt-4" onClick={() => setShowInspiration(true)}>Inspiration</button>
          </div>
        </section>
      </main>
      <footer className="footer">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default App;