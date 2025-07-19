import React from 'react';
import '../App.css';

const InspirationScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="App">
      <header className="navbar">
        <h1>Inspiration</h1>
        <a href="#" onClick={onBack}>Zurück</a>
      </header>
      <main className="card">
        <section className="card">
          <h2>Rotweine</h2>
          <p>Entdecke unsere Auswahl an kräftigen Rotweinen.</p>
          <button className="btn-primary">Mehr erfahren</button>
        </section>
        <section className="card">
          <h2>Weißweine</h2>
          <p>Frische und elegante Weißweine für jede Gelegenheit.</p>
          <input type="range" min="0" max="100" />
          <button className="btn-secondary">Filter anwenden</button>
        </section>
        <section className="card">
          <h2>Sonderangebote</h2>
          <div className="alert alert-success">10% Rabatt auf alle Weine!</div>
          <button className="btn-outline">Zum Shop</button>
        </section>
      </main>
      <footer>
        <p className="text-muted">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default InspirationScreen;