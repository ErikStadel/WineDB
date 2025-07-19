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
    axios.get(`${apiUrl}/wines`)
      .then(response => setWines(response.data))
      .catch(error => console.error('Fehler:', error));
  }, []);

  if (showAddWine) {
    return <AddWineScreen onBack={() => setShowAddWine(false)} apiUrl={apiUrl} />;
  }
  if (showInspiration) {
    return <InspirationScreen onBack={() => setShowInspiration(false)} />;
  }

  return (
    <div className="App">
      <main className="card">
        <h2 className="text-accent">Startscreen</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '2rem 0', alignItems: 'center' }}>
          <button className="btn-primary" onClick={() => setShowAddWine(true)}>Wein hinzufügen</button>
          <button className="btn-primary btn-outline" onClick={() => alert('Datenbank geöffnet')}>Datenbank</button>
          <button className="btn-primary btn-outline" onClick={() => setShowInspiration(true)}>Inspiration</button>
        </div>
      </main>
    </div>
  );
};

export default App;