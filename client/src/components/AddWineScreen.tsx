import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

interface AddWineScreenProps {
  onBack: () => void;
  apiUrl: string;
}

const AddWineScreen: React.FC<AddWineScreenProps> = ({ onBack, apiUrl }) => {
  const [form, setForm] = useState<{
    name: string;
    rebsorte: string;
    farbe: string;
    preis: string;
    kauforte: string[];
    geschmack: string[];
    kategorie: string;
    unterkategorie: string;
    notizen: string;
    bewertung: number;
    imageUrl: string;
  }>({
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
  const [successMessage, setSuccessMessage] = useState(false);

  const handleImageUpload = async (e: React.MouseEvent) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        try {
          const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            params: { key: process.env.REACT_APP_IMGBB_API_KEY, expiration: 600 },
          });
          setForm({ ...form, imageUrl: response.data.data.url });
        } catch (error: any) {
          console.error('imgbb Upload Fehler:', error.response?.data || error.message);
        }
      }
    };
    input.click();
  };

  const handleGeschmackChange = (value: string) => {
    if (form.geschmack.includes(value)) {
      setForm({ ...form, geschmack: form.geschmack.filter(g => g !== value) });
    } else if (form.geschmack.length < 2) {
      setForm({ ...form, geschmack: [...form.geschmack, value] });
    }
  };

  const handleKategorieChange = (kategorie: string) => {
    setForm({ ...form, kategorie, unterkategorie: '' });
  };

  const handleUnterkategorieChange = (unterkategorie: string) => {
    setForm({ ...form, unterkategorie });
  };

  const handleBewertungChange = (bewertung: number) => {
    setForm({ ...form, bewertung });
  };

  const handleSave = async () => {
    const wineData = {
      ...form,
      timestamp: new Date().toISOString(),
    };
    console.log('Gesendete Daten:', wineData);
    try {
      await axios.post(`${apiUrl}/wine`, wineData, { headers: { 'Content-Type': 'application/json' } });
      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
        onBack();
      }, 2000);
    } catch (error: any) {
      console.error('Speicherfehler:', error.response?.data || error.message);
    }
  };

  interface UnterkategorieOptions {
    [key: string]: string[];
    Evergreen: string[];
    Weinstand: string[];
    Kochwein: string[];
    'Seltene Weine': string[];
  }

  const unterkategorieOptions: UnterkategorieOptions = {
    Evergreen: ['schwer', 'leicht', 'Anlass'],
    Weinstand: ['schwer', 'leicht', 'Anlass'],
    Kochwein: ['auch trinkbar', 'Tafelwein', 'Fail'],
    'Seltene Weine': ['Geschenk', 'Geheimtipp', 'Anlass'],
  };

  const geschmackOptions = [
    'spritzig',
    'fruchtig',
    'dünn',
    'extraordinär',
    'kräftig',
    'intensiv',
    'gefällig',
  ];

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="text-xl md:text-2xl font-semibold text-white !text-[#ffffff] text-center">Wein Hinzufügen</h1>
        <span
          className="text-[#ffffff] !text-[#ffffff] hover:text-[#baddff] font-medium text-xs md:text-sm cursor-pointer transition-colors z-30 px-2"
          onClick={onBack}
        >
          Zurück
        </span>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-12">
        <section className="glass-card image-upload">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Bild hinzufügen</h2>
          <span
            className="text-4xl text-[#496580] font-bold cursor-pointer flex justify-center items-center h-24"
            onClick={handleImageUpload}
          >
            +
          </span>
          {form.imageUrl && <img src={form.imageUrl} alt="Vorschau" className="w-full max-w-[300px] object-contain rounded-lg mt-4" />}
        </section>
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Wein Details</h2>
          <label className="block font-semibold text-[#496580] mb-1">Gekauft bei</label>
          <select
            value={form.kauforte[0] || ''}
            onChange={(e) => setForm({ ...form, kauforte: [e.target.value] })}
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          >
            <option value="" disabled>Kaufort auswählen</option>
            <option value="Rewe">Rewe</option>
            <option value="Kaufland">Kaufland</option>
            <option value="Hit">Hit</option>
            <option value="Aldi">Aldi</option>
            <option value="Lidl">Lidl</option>
            <option value="Edeka">Edeka</option>
          </select>
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="z.B. Merlot 2020"
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          />
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Sorte</label>
          <input
            value={form.rebsorte}
            onChange={(e) => setForm({ ...form, rebsorte: e.target.value })}
            placeholder="z.B. Cabernet Sauvignon"
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          />
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Farbe</label>
          <select
            value={form.farbe}
            onChange={(e) => setForm({ ...form, farbe: e.target.value })}
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          >
            <option value="" disabled>Farbe auswählen</option>
            <option value="Rot">Rot</option>
            <option value="Weiß">Weiß</option>
            <option value="Rosé">Rosé</option>
          </select>
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Preis</label>
          <select
            value={form.preis}
            onChange={(e) => setForm({ ...form, preis: e.target.value })}
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          >
            <option value="" disabled>Preis auswählen</option>
            <option value="unter_5">{'<5 €'}</option>
            <option value="5_8">5-8 €</option>
            <option value="8_12">8-12 €</option>
            <option value="12_15">12-15 €</option>
            <option value="ueber_15">{'>15 €'}</option>
          </select>
        </section>
        <section className="glass-card geschmack-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Geschmack</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              {geschmackOptions.slice(0, 4).map(g => (
                <label key={g} className="unterkategorie-label text-[#496580]">
                  <input
                    type="checkbox"
                    checked={form.geschmack.includes(g)}
                    onChange={() => handleGeschmackChange(g)}
                    className="w-4 h-4 rounded-full accent-[#baddff]"
                  />
                  <span className="text-base">{g}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {geschmackOptions.slice(4).map(g => (
                <label key={g} className="unterkategorie-label text-[#496580]">
                  <input
                    type="checkbox"
                    checked={form.geschmack.includes(g)}
                    onChange={() => handleGeschmackChange(g)}
                    className="w-4 h-4 rounded-full accent-[#baddff]"
                  />
                  <span className="text-base">{g}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Kategorie</h2>
          <div className="grid grid-cols-auto-fit gap-4">
            {['Evergreen', 'Weinstand', 'Kochwein', 'Seltene Weine'].map(k => (
              <div
                key={k}
                className={`category-tile flex items-center justify-center rounded-lg cursor-pointer ${form.kategorie === k ? 'selected' : ''}`}
                onClick={() => handleKategorieChange(k)}
              >
                <span className="text-base font-medium text-center">{k}</span>
              </div>
            ))}
          </div>
          {form.kategorie && (
            <div className="mt-6">
              <h3 className="text-base font-semibold text-[#496580] mb-2">Unterkategorie</h3>
              <div className="flex flex-col gap-4">
                {unterkategorieOptions[form.kategorie].map((u: string) => (
                  <label key={u} className="unterkategorie-label text-[#496580]">
                    <input
                      type="radio"
                      name="unterkategorie"
                      checked={form.unterkategorie === u}
                      onChange={() => handleUnterkategorieChange(u)}
                      className="w-4 h-4 rounded-full accent-[#baddff]"
                    />
                    <span className="text-base">{u}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="glass-card bewertung-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Bewertung</h2>
          <div className="flex flex-row gap-2 flex-nowrap">
            {[1, 2, 3, 4, 5].map(star => (
              <svg
                key={star}
                className={`w-4 h-4 cursor-pointer flex-shrink-0`}
                style={{ fill: star <= form.bewertung ? '#baddff' : 'none', stroke: star <= form.bewertung ? '#baddff' : '#496580', strokeWidth: 2 }}
                onClick={() => handleBewertungChange(star)}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
            ))}
          </div>
        </section>
        {successMessage && <div className="glass-alert p-3 rounded-lg mt-4">Wein erfolgreich hinzugefügt!</div>}
      </main>
      <footer className="footer">
        <button className="footer-btn w-full text-base font-medium" onClick={handleSave}>Speichern</button>
      </footer>
    </div>
  );
};

export default AddWineScreen;