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
  const [cloudFunctionReady, setCloudFunctionReady] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  
  // Scroll-Position für WineDBScreen speichern
  const wineDBScrollPosition = useRef<number>(0);

  // API-URL basierend auf Umgebungsvariable oder Fallback für lokale Tests
  const apiUrl = process.env.REACT_APP_API_URL || 
    (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://192.168.0.208:3001');

  const cloudFunctionUrl = 'https://cloud-job-608509602627.europe-west3.run.app';

  // Server und Cloud Function beim App-Start "aufwecken"
  useEffect(() => {
    const wakeUpServices = async () => {
      // Nur wenn nicht localhost (d.h. in Produktion)
      if (window.location.hostname === 'localhost') {
        setServerReady(true);
        setCloudFunctionReady(true);
        return;
      }

      setIsWakingUp(true);

      // Parallel beide Services aufwecken
      const wakeUpServer = async () => {
        try {
          const response = await axios.get(`${apiUrl}/health`, { 
            timeout: 30000 
          });
          console.log('✅ Server ist bereit:', response.data);
          setServerReady(true);
        } catch (error) {
          console.log('Server noch nicht bereit, versuche Fallback...');
          try {
            await axios.get(`${apiUrl}/wines`, { timeout: 30000 });
            console.log('✅ Server über /wines endpoint erreicht');
            setServerReady(true);
          } catch (fallbackError) {
            console.error('❌ Server nicht erreichbar:', fallbackError);
            setServerReady(true); // App trotzdem laden
          }
        }
      };

      const wakeUpCloudFunction = async () => {
        try {
          console.log('🚀 Wecke Cloud Function auf...');
          // Dummy-Request um die Cloud Function zu starten
          // OPTIONS request für CORS preflight - löst Kaltstart aus
          await axios.options(`${cloudFunctionUrl}/imageSearch`, {
            timeout: 45000, // 45 Sekunden für Kaltstart
            headers: {
              'Origin': window.location.origin
            }
          });
          console.log('✅ Cloud Function ist bereit');
          setCloudFunctionReady(true);
        } catch (error: any) {
          // 204 No Content ist OK bei OPTIONS
          if (error.response?.status === 204) {
            console.log('✅ Cloud Function ist bereit (OPTIONS 204)');
            setCloudFunctionReady(true);
          } else {
            console.warn('⚠️ Cloud Function Warmup fehlgeschlagen, wird beim ersten Scan nachgeholt');
            setCloudFunctionReady(true); // Trotzdem weitermachen
          }
        }
      };

      // Beide parallel starten
      await Promise.all([wakeUpServer(), wakeUpCloudFunction()]);
      
      setIsWakingUp(false);
    };

    wakeUpServices();
  }, [apiUrl]);

  const handleWineDBBack = () => {
    wineDBScrollPosition.current = 0;
    setShowWineDB(false);
  };

  const handleWineDBOpen = () => {
    setShowWineDB(true);
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
              disabled={isWakingUp}
            >
              Wein Scannen
              {!cloudFunctionReady && !isWakingUp && (
                <span className="text-sm opacity-75"> (KI lädt...)</span>
              )}
            </button>
          </div>
        </section>
        
        {/* Loading State während Services aufwachen */}
        {isWakingUp && (
          <div className="glass-alert mb-4 mt-6 p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="loader"></div>
                <span className="font-medium">Dienste werden gestartet...</span>
              </div>
              <div className="text-sm opacity-75 ml-8">
                {!serverReady && '⏳ Server startet...'}
                {serverReady && !cloudFunctionReady && '⏳ Bild-KI lädt Modelle...'}
                {serverReady && cloudFunctionReady && '✅ Alles bereit!'}
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="footer">
  <p className="text-sm">❤️ We Love Wein ❤️</p>
  <p className="text-xs text-gray-400">v 2.4</p>
</footer>
    </div>
  );
};

export default App;