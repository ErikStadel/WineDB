import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import InspirationScreen from './components/InspirationScreen'; // Neue Komponente

interface Wine {
  _id: string;
  name: string;
  hersteller: string;
  jahrgang: number;
  bewertung: number;
  timestamp: string;
}

const App: React.FC = () => {
  const [wines, setWines] = useState<Wine[]>([]);
  const [form, setForm] = useState({ name: '', hersteller: '', jahrgang: 0, bewertung: 0 });
  const [showInspiration, setShowInspiration] = useState(false);

  const handleAddWine = () => {
    axios.post(`${apiUrl}/wine`, form)
      .then(() => {
        setForm({ name: '', hersteller: '', jahrgang: 0, bewertung: 0 });
        return axios.get(`${apiUrl}/wines`);
      })
      .then(res => setWines(res.data))
      .catch(error => console.error('Fehler:', error));
  };

  const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://192.168.0.208:3001';

  useEffect(() => {
    axios.get(`${apiUrl}/wines`)
      .then(response => setWines(response.data))
      .catch(error => console.error('Fehler:', error));
  }, []);

  if (showInspiration) {
    return <InspirationScreen onBack={() => setShowInspiration(false)} />;
  }

  return (
    <div className="App">
      <header className="navbar">
        <h1>Wein-Bewertungs-App</h1>
      </header>
      <main className="card">
        <h2 className="text-accent">Startscreen</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', margin: '2rem 0' }}>
          <button className="btn-primary" onClick={handleAddWine}>Wein hinzufügen</button>
          <button className="btn-secondary" onClick={() => alert('Datenbank geöffnet')}>Datenbank</button>
          <button className="btn-outline" onClick={() => setShowInspiration(true)}>Inspiration</button>
        </div>
      </main>
      <footer>
        <p>© 2025 Wein-App</p>
      </footer>
    </div>
  );
};

export default App;