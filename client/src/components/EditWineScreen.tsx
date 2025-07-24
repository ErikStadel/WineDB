import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { mockWines } from '../mocks/mockWines';
import { Wine } from '../types/Wine';

interface EditWineScreenProps {
  wineId: string;
  onBack: () => void;
  apiUrl: string;
}

const EditWineScreen: React.FC<EditWineScreenProps> = ({ wineId, onBack, apiUrl }) => {
  const [form, setForm] = useState<Omit<Wine, '_id' | 'timestamp'>>({
    name: '',
    rebsorte: '',
    farbe: '',
    preis: '',
    kauforte: [],
    geschmack: [],
    kategorie: '',
    unterkategorie: '',
    notizen: '',
    bewertung: 0,
    imageUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  // Lade Weindaten
  useEffect(() => {
    // Direkter Check auf true string, da env-Variablen immer strings sind
    const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';
    console.log('UseMockData:', useMockData); // Debug-Ausgabe
    
    if (useMockData) {
      console.log('Suche Wein mit ID:', wineId); // Debug-Ausgabe
      console.log('Verfügbare Mock-Daten:', mockWines); // Debug-Ausgabe
    
      const mockWine = mockWines.find((w: Wine) => w._id.$oid === wineId);
      if (mockWine) {
        console.log('Gefundener Wein:', mockWine); // Debug-Ausgabe
        const { _id, timestamp, ...wineData } = mockWine;
        setForm(wineData);
      } else {
        setError('Wein nicht gefunden');
      }
      setLoading(false);
    } else {
      axios.get(`${apiUrl}/wine/${wineId}`)
        .then(res => {
          const { _id, timestamp, ...wineData } = res.data;
          setForm(wineData);
          setLoading(false);
        })
        .catch(err => {
          setError('Fehler beim Laden der Weindaten');
          setLoading(false);
        });
    }
  }, [wineId, apiUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';
    
    if (useMockData) {
      const mockIndex = mockWines.findIndex((w: Wine) => w._id.$oid === wineId);
      if (mockIndex !== -1) {
        mockWines[mockIndex] = {
          ...mockWines[mockIndex],
          ...form,
          timestamp: { $date: new Date().toISOString() }
        };
      }
      setSuccessMessage(true);
      setTimeout(() => {
        onBack();
      }, 1500);
    } else {
      try {
        await axios.put(`${apiUrl}/wine/${wineId}`, form);
        setSuccessMessage(true);
        setTimeout(() => {
          onBack();
        }, 1500);
      } catch (err) {
        setError('Fehler beim Speichern der Änderungen');
      }
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie diesen Wein wirklich löschen?')) {
      return;
    }

    setLoading(true);
    setError(null);

    const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';
    
    if (useMockData) {
      const mockIndex = mockWines.findIndex((w: Wine) => w._id.$oid === wineId);
      if (mockIndex !== -1) {
        mockWines.splice(mockIndex, 1);
      }
      onBack();
    } else {
      try {
        await axios.delete(`${apiUrl}/wine/${wineId}`);
        onBack();
      } catch (err) {
        setError('Fehler beim Löschen des Weins');
        setLoading(false);
      }
    }
  };

  if (loading) return <div>Laden...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein bearbeiten</h1>
        <span className="header-back" onClick={onBack}>
          Zurück
        </span>
      </header>
      <main className="flex-1 p-6">
        {/* Hier kommt das gleiche Formular wie in AddWineScreen */}
        {/* ... */}
        <div className="flex justify-between mt-4">
          <button 
            className="btn-outline text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
            onClick={handleDelete}
          >
            Löschen
          </button>
          <button 
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            Speichern
          </button>
        </div>
      </main>
      {successMessage && (
        <div className="glass-alert">
          Änderungen erfolgreich gespeichert
        </div>
      )}
    </div>
  );
};

export default EditWineScreen;