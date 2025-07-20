import React from 'react';
import '../App.css';

const InspirationScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#ffdbbb] text-[#496580]">
      <header className="glass-header p-4 flex justify-between items-center rounded-b-xl sticky top-0 z-10">
        <h1 className="text-xl md:text-2xl font-semibold text-[#ffffff]">Wein Inspiration</h1>
        <button
          className="text-[#ffffff] hover:text-[#baddff] font-medium transition-colors"
          onClick={onBack}
        >
          Zurück
        </button>
      </header>

      <main className="flex-1 p-4 flex flex-col items-center">
        {/* Wrapper-Divs sorgen für Abstand */}
        <div className="mb-10 w-full max-w-md">
          <section className="glass-card p-4">
            <h2 className="text-lg md:text-xl font-semibold mb-2">Rotweine</h2>
            <p className="mb-2">Entdecke unsere Auswahl an kräftigen Rotweinen.</p>
            <button className="btn-primary w-full text-base font-medium">Mehr erfahren</button>
          </section>
        </div>

        <div className="mb-10 w-full max-w-md">
          <section className="glass-card p-4">
            <h2 className="text-lg md:text-xl font-semibold mb-2">Weißweine</h2>
            <p className="mb-2">Frische und elegante Weißweine für jede Gelegenheit.</p>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full accent-[#baddff] h-2 rounded-lg mb-2"
            />
            <button className="btn-secondary w-full text-base font-medium">Filter anwenden</button>
          </section>
        </div>

        <div className="mb-10 w-full max-w-md">
          <section className="glass-card p-4">
            <h2 className="text-lg md:text-xl font-semibold mb-2">Sonderangebote</h2>
            <div className="glass-alert p-3 rounded-lg mb-2">🥂 10% Rabatt auf alle Weine!</div>
            <button className="btn-outline w-full text-base font-medium">Zum Shop</button>
          </section>
        </div>
      </main>

      <footer className="bg-[#496580] text-[#ffffff] text-center p-2 rounded-t-xl sticky bottom-0">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default InspirationScreen;
