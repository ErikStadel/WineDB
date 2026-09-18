import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Wine } from '../types/Wine';
import { mockWines } from '../mocks/mockWines';
import { calculateWineStatistics, WineStatistics } from '../utils/wineStats';
import '../App.css';

interface StatsScreenProps {
  onBack: () => void;
  apiUrl: string;
}

const StatsScreen: React.FC<StatsScreenProps> = ({ onBack, apiUrl }) => {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllGrapes, setShowAllGrapes] = useState(false);

  const fetchWines = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    if (process.env.REACT_APP_USE_MOCK_DATA === 'true') {
      setWines(mockWines);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${apiUrl}/wines`, { timeout: 15000 });
      const rawData = response.data;
      const formattedWines: Wine[] = (Array.isArray(rawData) ? rawData : []).map((w: any) => ({
        ...w,
        _id: typeof w._id === 'string' ? { $oid: w._id } : w._id,
        timestamp: typeof w.timestamp === 'string' ? { $date: w.timestamp } : w.timestamp,
      }));
      setWines(formattedWines);
    } catch (err: any) {
      console.error('Fehler beim Laden der Weindaten für die Statistik:', err.message);
      // Fallback zu mockWines wenn offline oder Testumgebung
      if (mockWines && mockWines.length > 0) {
        setWines(mockWines);
      } else {
        setError('Weine konnten nicht geladen werden. Bitte prüfe deine Verbindung.');
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchWines();
  }, [fetchWines]);

  const stats: WineStatistics = useMemo(() => {
    return calculateWineStatistics(wines);
  }, [wines]);

  const displayedGrapes = showAllGrapes
    ? stats.grapeRankings
    : stats.grapeRankings.slice(0, 8);

  const maxStoreCount = stats.topStores.length > 0 ? stats.topStores[0].count : 1;
  const maxGrapeCount = stats.grapeRankings.length > 0 ? stats.grapeRankings[0].count : 1;
  const maxColorCount = stats.colors.length > 0 ? stats.colors[0].count : 1;

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Statistik</h1>
        <span className="header-back" onClick={onBack}>
          Zurück
        </span>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center gap-6" style={{ paddingBottom: '3rem' }}>
        {loading ? (
          <div className="glass-card flex flex-col items-center justify-center p-8 gap-4 w-full max-w-lg">
            <div className="loader" style={{ width: 36, height: 36 }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--color-text-secondary)' }}>
              Berechne Weinstatistiken…
            </span>
          </div>
        ) : error ? (
          <div className="glass-card flex flex-col items-center gap-4 w-full max-w-lg text-center">
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <p style={{ color: 'var(--color-text-primary)' }}>{error}</p>
            <button className="btn-primary" onClick={fetchWines}>
              Erneut versuchen
            </button>
          </div>
        ) : (
          <div className="stats-container">
            {/* ── KPI Schnellübersicht ── */}
            <div className="stat-kpi-grid">
              <div className="stat-kpi-card">
                <span className="stat-kpi-label">Weine gesamt</span>
                <span className="stat-kpi-value">{stats.totalWines}</span>
                <span className="stat-kpi-sub">in der Datenbank</span>
              </div>
              <div className="stat-kpi-card">
                <span className="stat-kpi-label">Rebsorten</span>
                <span className="stat-kpi-value">{stats.uniqueGrapesCountPure}</span>
                <span className="stat-kpi-sub">Sorten probiert</span>
              </div>
              <div className="stat-kpi-card">
                <span className="stat-kpi-label">Ø-Preis</span>
                <span className="stat-kpi-value">
                  {stats.averagePrice > 0 ? `${stats.averagePrice.toFixed(2).replace('.', ',')} €` : '–'}
                </span>
                <span className="stat-kpi-sub">{stats.winesWithPrice} bewertet</span>
              </div>
              <div className="stat-kpi-card">
                <span className="stat-kpi-label">Top Kaufort</span>
                <span
                  className="stat-kpi-value"
                  style={{ fontSize: '1.4rem', marginTop: '0.2rem' }}
                >
                  {stats.topStores[0]?.store || '–'}
                </span>
                <span className="stat-kpi-sub">
                  {stats.topStores[0] ? `${stats.topStores[0].count} Weine` : ''}
                </span>
              </div>
            </div>

            {/* ── 1. Weine je Farbe ── */}
            <section className="glass-card">
              <h2>Weine je Farbe</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
                {stats.colors.map(col => (
                  <div key={col.color} className="stat-row-item">
                    <div className="stat-row-header">
                      <span className="stat-row-name">
                        <span
                          style={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: col.stripeColor,
                            boxShadow: `0 0 8px ${col.stripeColor}`,
                          }}
                        />
                        {col.color}
                      </span>
                      <span className="stat-row-meta">
                        <strong>{col.count}</strong> Weine ({col.percentage}%)
                      </span>
                    </div>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill"
                        style={{
                          width: `${(col.count / maxColorCount) * 100}%`,
                          backgroundColor: col.stripeColor,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 2. Kauforte Ranking ── */}
            <section className="glass-card">
              <h2>Wo wurden die meisten Weine gekauft?</h2>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.82rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '1rem',
                  marginTop: '-0.25rem',
                }}
              >
                Übersicht der beliebtesten Händler und Bezugsquellen
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.topStores.map((item, idx) => (
                  <div key={item.store} className="stat-row-item">
                    <div className="stat-row-header">
                      <span className="stat-row-name">
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: idx < 3 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                            minWidth: 18,
                          }}
                        >
                          #{idx + 1}
                        </span>
                        {item.store}
                      </span>
                      <span className="stat-row-meta">
                        <strong>{item.count}</strong> Weine ({item.percentage}%)
                      </span>
                    </div>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill"
                        style={{
                          width: `${(item.count / maxStoreCount) * 100}%`,
                          backgroundColor: idx === 0 ? 'var(--color-accent)' : 'var(--color-accent-dim)',
                          border: idx === 0 ? '1px solid var(--color-accent)' : 'none',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 3. & 4. Rebsorten (Normalisiert & Anzahl) ── */}
            <section className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2>Rebsorten</h2>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.85rem',
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                  }}
                >
                  {stats.uniqueGrapesCountPure} Sorten probiert
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '1.25rem',
                  marginTop: '-0.25rem',
                  lineHeight: 1.4,
                }}
              >
                Freitext-Eingaben wurden normalisiert (z.&nbsp;B. Bereinigung von Jahrgängen, Reifegraden &amp;
                Synonym-Zusammenführung wie <em>Weißer Burgunder</em> &rarr; <em>Weißburgunder</em>).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {displayedGrapes.map((g, idx) => (
                  <div key={g.grape} className="stat-row-item">
                    <div className="stat-row-header">
                      <span className="stat-row-name">
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: idx < 3 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                            minWidth: 18,
                          }}
                        >
                          #{idx + 1}
                        </span>
                        {g.grape}
                        {g.isBlend && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: 'rgba(255,255,255,0.08)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            Cuvée
                          </span>
                        )}
                      </span>
                      <span className="stat-row-meta">
                        <strong>{g.count}</strong> {g.count === 1 ? 'Wein' : 'Weine'}
                      </span>
                    </div>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill"
                        style={{
                          width: `${(g.count / maxGrapeCount) * 100}%`,
                          backgroundColor:
                            idx === 0
                              ? 'var(--color-accent)'
                              : g.isBlend
                              ? 'rgba(201, 169, 110, 0.35)'
                              : 'var(--color-accent-light)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {stats.grapeRankings.length > 8 && (
                <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                  <button
                    className="btn-outline"
                    style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                    onClick={() => setShowAllGrapes(prev => !prev)}
                  >
                    {showAllGrapes
                      ? '▲ Weniger anzeigen'
                      : `▼ Alle ${stats.grapeRankings.length} Rebsorten anzeigen`}
                  </button>
                </div>
              )}
            </section>

            {/* ── 5. Preisanalyse ── */}
            <section className="glass-card">
              <h2>Durchschnittspreis &amp; Preisklassen</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'rgba(201, 169, 110, 0.08)',
                  borderRadius: 6,
                  border: '1px solid var(--color-glass-border)',
                  marginBottom: '1.25rem',
                  marginTop: '0.5rem',
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.72rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Durchschnittspreis
                  </span>
                  <span
                    style={{
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: '2.2rem',
                      fontWeight: 700,
                      color: 'var(--color-heading)',
                    }}
                  >
                    {stats.averagePrice > 0 ? `${stats.averagePrice.toFixed(2).replace('.', ',')} €` : '–'}
                  </span>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <div>Basis: {stats.winesWithPrice} Weine</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    (Slider- &amp; Spannenmittelwert)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--color-accent)',
                    marginBottom: '0.2rem',
                  }}
                >
                  Verteilung nach Preisstufen
                </span>
                {stats.priceDistribution.map(p => {
                  const maxPriceDistCount = Math.max(...stats.priceDistribution.map(d => d.count), 1);
                  const percent = stats.winesWithPrice > 0 ? Math.round((p.count / stats.winesWithPrice) * 100) : 0;
                  return (
                    <div key={p.range} className="stat-row-item">
                      <div className="stat-row-header">
                        <span className="stat-row-name">{p.range}</span>
                        <span className="stat-row-meta">
                          <strong>{p.count}</strong> Weine ({percent}%)
                        </span>
                      </div>
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{
                            width: `${(p.count / maxPriceDistCount) * 100}%`,
                            backgroundColor: 'var(--color-accent)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── 6. Geschmack vs. Bewertung ── */}
            <section className="glass-card">
              <h2>Geschmack &amp; Bewertung</h2>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.82rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '1rem',
                  marginTop: '-0.25rem',
                  lineHeight: 1.4,
                }}
              >
                Welche Geschmacksnoten stehen am häufigsten mit Spitzenbewertungen (&ge; 4 Sterne) vs. niedrigen Noten (&le; 2 Sterne) zusammen?
              </p>

              <div className="taste-grid">
                {stats.tasteCorrelation.map(t => (
                  <div key={t.taste} className="taste-card">
                    <div className="taste-card-top">
                      <span className="taste-name">{t.taste}</span>
                      <span className="taste-rating">
                        ★ {t.averageRating.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <div className="taste-badges">
                      <span className="badge-pill badge-neutral">
                        {t.count} {t.count === 1 ? 'Wein' : 'Weine'}
                      </span>
                      {t.highRatingPercentage > 0 && (
                        <span className="badge-pill badge-high" title="Weine mit 4 oder 5 Sternen">
                          ▲ {t.highRatingPercentage}% Top (4-5★)
                        </span>
                      )}
                      {t.lowRatingPercentage > 0 && (
                        <span className="badge-pill badge-low" title="Weine mit 1 oder 2 Sternen">
                          ▼ {t.lowRatingPercentage}% Low (1-2★)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>❤ We Love Wein ❤</p>
        <p className="version-text">v 3.0 · Statistik</p>
      </footer>
    </div>
  );
};

export default StatsScreen;
