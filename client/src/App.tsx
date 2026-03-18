import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { Analytics } from '@vercel/analytics/react';
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

  const wineDBScrollPosition = useRef<number>(0);

  const apiUrl = process.env.REACT_APP_API_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://192.168.0.208:3001');

  const cloudFunctionUrl = 'https://cloud-job-608509602627.europe-west3.run.app';

  useEffect(() => {
    const wakeUpServices = async () => {
      if (window.location.hostname === 'localhost') {
        setServerReady(true);
        setCloudFunctionReady(true);
        return;
      }

      setIsWakingUp(true);

      const wakeUpServer = async () => {
        try {
          const response = await axios.get(`${apiUrl}/health`, { timeout: 30000 });
          console.log('✅ Server ist bereit:', response.data);
          setServerReady(true);
        } catch (error) {
          try {
            await axios.get(`${apiUrl}/wines`, { timeout: 30000 });
            setServerReady(true);
          } catch {
            setServerReady(true);
          }
        }
      };

      const wakeUpCloudFunction = async () => {
        try {
          await axios.options(`${cloudFunctionUrl}/imageSearch`, {
            timeout: 45000,
            headers: { 'Origin': window.location.origin },
          });
          setCloudFunctionReady(true);
        } catch (error: any) {
          if (error.response?.status === 204) {
            setCloudFunctionReady(true);
          } else {
            setCloudFunctionReady(true);
          }
        }
      };

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
    if (serverReady) axios.get(`${apiUrl}/wines`).catch(() => {});
  };

  if (showAddWine)    return <AddWineScreen    onBack={() => setShowAddWine(false)}    apiUrl={apiUrl} />;
  if (showScanWine)   return <ScanWineScreen   onBack={() => setShowScanWine(false)}   apiUrl={apiUrl} />;
  if (showInspiration) return <InspirationScreen onBack={() => setShowInspiration(false)} />;
  if (showWineDB)     return (
    <WineDBScreen
      onBack={handleWineDBBack}
      apiUrl={apiUrl}
      scrollPosition={wineDBScrollPosition}
    />
  );

  return (
    <>
      <Analytics />
      <div className="App">
        <header className="glass-header">
          <h1 className="header-title">Wein Bewertung</h1>
        </header>

        <main className="flex-1 p-6 flex flex-col items-center gap-12">
          <section className="glass-card">
            {/* Subtle accent line under heading */}
            <h2 style={{ marginBottom: '1.5rem' }}>Willkommen</h2>

            <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
              <button
                className="btn-primary text-base font-medium w-full"
                style={{ maxWidth: '100%' }}
                onClick={() => setShowAddWine(true)}
                disabled={isWakingUp}
              >
                Wein hinzufügen
              </button>
              <button
                className="btn-primary text-base font-medium w-full"
                style={{ maxWidth: '100%' }}
                onClick={handleWineDBOpen}
                disabled={isWakingUp}
              >
                Datenbank
                {!serverReady && !isWakingUp && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.65 }}> (Server startet…)</span>
                )}
              </button>
              <button
                className="btn-outline text-base font-medium w-full"
                style={{ maxWidth: '100%' }}
                onClick={() => setShowScanWine(true)}
                disabled={isWakingUp}
              >
                Wein Scannen
                {!cloudFunctionReady && !isWakingUp && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.65 }}> (KI lädt…)</span>
                )}
              </button>
            </div>
          </section>

          {isWakingUp && (
            <div className="glass-alert mb-4 mt-6 p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="loader" style={{ margin: 0, width: 28, height: 28 }}></div>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
                    Dienste werden gestartet…
                  </span>
                </div>
                <div style={{
                  fontSize: '0.78rem',
                  opacity: 0.6,
                  marginLeft: '40px',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  {!serverReady && '⏳ Server startet…'}
                  {serverReady && !cloudFunctionReady && '⏳ Bild-KI lädt Modelle…'}
                  {serverReady && cloudFunctionReady && '✅ Alles bereit!'}
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <p>❤ We Love Wein ❤</p>
          <p className="version-text">v 2.7</p>
        </footer>
      </div>
    </>
  );
};

export default App;