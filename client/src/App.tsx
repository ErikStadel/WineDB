import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const App: React.FC = () => {
  const [wines, setWines] = useState<any[]>([]);

  useEffect(() => {
    axios.get('http://localhost:3000/wines')
      .then(response => setWines(response.data))
      .catch(error => console.error('Fehler:', error));
  }, []);

  return (
    <div className="App">
      <h1>Wein-Bewertungs-App</h1>
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