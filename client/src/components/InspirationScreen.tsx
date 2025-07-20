import React from 'react';
import '../App.css';

const InspirationScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="text-xl md:text-2xl font-semibold text-white !text-[#ffffff] text-center">Wein Inspiration</h1>
        <span
          className="text-[#ffffff] !text-[#ffffff] hover:text-[#baddff] font-medium text-xs md:text-sm cursor-pointer transition-colors z-30 px-2"
          onClick={onBack}
        >
          Zurück
        </span>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center gap-12">
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Rotweine</h2>
          <p className="mb-4">Entdecke unsere Auswahl an kräftigen Rotweinen.</p>
          <button className="btn-primary mt-4">Mehr erfahren</button>
        </section>

        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Weißweine</h2>
          <p className="mb-4">Frische und elegante Weißweine für jede Gelegenheit.</p>
          <input
            type="range"
            min="0"
            max="100"
            className="w-full mb-4"
          />
          <button className="btn-secondary mt-4">Filter anwenden</button>
        </section>

        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Sonderangebote</h2>
          <div className="glass-alert mb-4">🥂 10% Rabatt auf alle Weine!</div>
          <button className="btn-outline mt-4">Zum Shop</button>
        </section>
      </main>

      <footer className="footer">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default InspirationScreen;