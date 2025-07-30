import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AddWineScreen from './components/AddWineScreen';
import InspirationScreen from './components/InspirationScreen';
import WineDBScreen from './components/WineDBScreen';
import ScanWineScreen from './components/ScanWineScreen';

const App: React.FC = () => {
  const [showAddWine, setShowAddWine] = useState(false);
  const [showInspiration, setShowInspiration] = useState(false);
  const [showWineDB, setShowWineDB] = useState(false);
  const [showScanWine, setShowScanWine] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  
  // Scroll-Position für WineDBScreen speichern
  const wineDBScrollPosition = useRef<number>(0);

  // API-URL basierend auf Umgebungsvariable oder Fallback für lokale Tests
  const apiUrl = process.env.REACT_APP_API_URL || 
    (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://192.168.0.208:3001');

  // Server beim App-Start "aufwecken"
  useEffect(() => {
    const wakeUpServer = async () => {
      
      // Nur wenn nicht localhost (d.h. in Produktion)
      if (window.location.hostname === 'localhost') {
        setServerReady(true);
        return;
      }

      setIsWakingUp(true);
      try {
        // Einfacher Health-Check Endpoint
        const response = await axios.get(`${apiUrl}/health`, { 
          timeout: 30000 // 30 Sekunden Timeout
        });
        console.log('Server ist bereit:', response.data);
        setServerReady(true);
      } catch (error) {
        console.log('Server noch nicht bereit, versuche Fallback...');
        // Fallback: Versuche /wines endpoint
        try {
          await axios.get(`${apiUrl}/wines`, { timeout: 30000 });
          console.log('Server über /wines endpoint erreicht');
          setServerReady(true);
        } catch (fallbackError) {
          console.error('Server nicht erreichbar:', fallbackError);
          // App trotzdem laden, aber mit Warnung
          setServerReady(true);
        }
      } finally {
        setIsWakingUp(false);
      }
    };

    wakeUpServer();
  }, [apiUrl]);

  const handleWineDBBack = () => {
    // Scroll-Position zurücksetzen beim Verlassen
    wineDBScrollPosition.current = 0;
    setShowWineDB(false);
  };

  const handleWineDBOpen = () => {
    setShowWineDB(true);
    // Optional: Nochmal einen sanften Preload
    if (serverReady) {
      axios.get(`${apiUrl}/wines`).catch(() => {});
    }
  };

  if (showAddWine) return <AddWineScreen onBack={() => setShowAddWine(false)} apiUrl={apiUrl} />;
  if (showScanWine) return <ScanWineScreen onBack={() => setShowScanWine(false)} apiUrl={apiUrl} />;
  if (showInspiration) return <InspirationScreen onBack={() => setShowInspiration(false)} />;
  if (showWineDB) return (
    <WineDBScreen 
      onBack={handleWineDBBack} 
      apiUrl={apiUrl}
      scrollPosition={wineDBScrollPosition}
    />
  );

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein Bewertung</h1>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-12">
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold text-[#baddff] mb-4">Willkommen</h2>  
          <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
            <button 
              className="btn-primary text-base font-medium w-full" 
              onClick={() => setShowAddWine(true)}
              disabled={isWakingUp}
            >
              Wein hinzufügen
            </button>
            <button 
              className="btn-primary text-base font-medium w-full" 
              onClick={handleWineDBOpen}
              disabled={isWakingUp}
            >
              Datenbank
              {!serverReady && !isWakingUp && (
                <span className="text-sm opacity-75"> (Server startet...)</span>
              )}
            </button>
            <button 
              className="btn-outline text-base font-medium w-full" 
              onClick={() => setShowScanWine(true)}
            >
              Wein Scannen
            </button>
          </div>
        </section>
        {/* Loading State während Server aufwacht */}
          {isWakingUp && (
            <div className="glass-alert mb-4 mt-6 p-4 flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="loader"></div>
                <span>Server wird gestartet...</span>
              </div>
            </div>
          )}
      </main>
      <footer className="footer">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default App;