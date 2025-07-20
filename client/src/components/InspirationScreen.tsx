import React from 'react';

const InspirationScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#ffdbbb] text-[#496580] px-4 py-6">
      <header className="glass-header rounded-b-xl mb-6 px-6 py-5 flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-semibold text-white leading-snug">Wein Inspiration</h1>
        <button
          className="text-white hover:text-[#baddff] font-medium transition-colors px-3 py-1 rounded"
          onClick={onBack}
          aria-label="Zurück"
        >
          Zurück
        </button>
      </header>

      <main className="flex-1">
        <section className="glass-card max-w-md mx-auto p-6 mb-10">
          <h2 className="text-lg md:text-xl font-semibold mb-4 leading-relaxed">Rotweine</h2>
          <p className="mb-6 leading-relaxed">Entdecke unsere Auswahl an kräftigen Rotweinen.</p>
          <button className="btn-primary w-full text-base font-medium py-3">Mehr erfahren</button>
        </section>

        <section className="glass-card max-w-md mx-auto p-6 mb-10">
          <h2 className="text-lg md:text-xl font-semibold mb-4 leading-relaxed">Weißweine</h2>
          <p className="mb-6 leading-relaxed">Frische und elegante Weißweine für jede Gelegenheit.</p>
          <div className="overflow-x-auto mb-6">
            <input
              type="range"
              min="0"
              max="100"
              className="w-full accent-[#baddff] h-2 rounded-lg"
              aria-label="Weißwein Filter"
            />
          </div>
          <button className="btn-secondary w-full text-base font-medium py-3">Filter anwenden</button>
        </section>

        <section className="glass-card max-w-md mx-auto p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4 leading-relaxed">Sonderangebote</h2>
          <div className="glass-alert p-4 rounded-lg mb-6 text-center font-semibold">
            🥂 10% Rabatt auf alle Weine!
          </div>
          <button className="btn-outline w-full text-base font-medium py-3">Zum Shop</button>
        </section>
      </main>

      <footer className="bg-[#496580] text-white text-center py-4 rounded-t-xl mt-6 max-w-md mx-auto">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default InspirationScreen;
