import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../App.css';

interface ScanWineScreenProps {
  onBack: () => void;
  apiUrl: string;
}
const successMessage = () => {
  alert('Kamera erfolgreich gestartet (Platzhalter)');
}
const ScanWineScreen: React.FC<ScanWineScreenProps> = ({ onBack, apiUrl }) => {
const startCamera = async () => {
  try {
    // Hier könnte Logik zum Starten der Kamera und Scannen des Etiketts implementiert werden
    console.log('Kamera gestartet (Platzhalter)');  
  }
    catch (error) {
        console.error('Fehler beim Starten der Kamera:', error);
        alert('Kamera konnte nicht gestartet werden. Bitte überprüfen Sie die Berechtigungen.');
    }
};



  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein Scanner</h1>
        <span className="header-back" onClick={onBack}>Zurück</span>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-6">
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Etikett scannen</h2>
          <div className="glass-card-content">
          <button
            onClick={successMessage}
            className="btn-primary text-base font-medium w-full mb-4"
          >
            Kamera starten
          </button>
          </div>
         
          
        </section>
      </main>
      <footer className="footer">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default ScanWineScreen;