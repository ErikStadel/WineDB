import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

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

  return (
    <div className="App">
      <h1>Wein-Bewertungs-App</h1>
      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" />
      <input value={form.hersteller} onChange={e => setForm({ ...form, hersteller: e.target.value })} placeholder="Hersteller" />
      <input type="number" value={form.jahrgang} onChange={e => setForm({ ...form, jahrgang: parseInt(e.target.value) })} placeholder="Jahrgang" />
      <input type="number" value={form.bewertung} onChange={e => setForm({ ...form, bewertung: parseInt(e.target.value) })} placeholder="Bewertung" />
      <button onClick={handleAddWine}>Wein hinzufügen</button>
      <ul>
        {wines.map((wine) => (
          <li key={wine._id}>
            {wine.name} ({wine.jahrgang}) - {wine.bewertung} Sterne
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;