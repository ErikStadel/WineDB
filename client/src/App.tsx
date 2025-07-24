import React, { useState } from 'react';
import './App.css';
import AddWineScreen from './components/AddWineScreen';
import InspirationScreen from './components/InspirationScreen';
import WineDBScreen from './components/WineDBScreen';

const App: React.FC = () => {
  const [showAddWine, setShowAddWine] = useState(false);
  const [showInspiration, setShowInspiration] = useState(false);
  const [showWineDB, setShowWineDB] = useState(false);

  const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://192.168.0.208:3001';

  if (showAddWine) return <AddWineScreen onBack={() => setShowAddWine(false)} apiUrl={apiUrl} />;
  if (showInspiration) return <InspirationScreen onBack={() => setShowInspiration(false)} />;
  if (showWineDB) return <WineDBScreen onBack={() => setShowWineDB(false)} apiUrl={apiUrl} />;

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein Bewertung</h1>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-12">
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold text-[#baddff] mb-4">Willkommen</h2>
          <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
            <button className="btn-primary text-base font-medium w-full" onClick={() => setShowAddWine(true)}>Wein hinzufügen</button>
            <button className="btn-primary text-base font-medium w-full" onClick={() => setShowWineDB(true)}>Datenbank</button>
            <button className="btn-outline text-base font-medium w-full" onClick={() => setShowInspiration(true)}>Inspiration</button>
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