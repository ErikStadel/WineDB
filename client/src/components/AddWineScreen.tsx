import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

interface AddWineScreenProps {
  onBack: () => void;
  apiUrl: string;
}

const AddWineScreen: React.FC<AddWineScreenProps> = ({ onBack, apiUrl }) => {
  const [form, setForm] = useState({ name: '', rebsorte: '', imageUrl: '', kauforte: [] as string[] });
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
          const response = await axios.post('https://api.imgbb.com/1/upload', formData, { params: { key: process.env.REACT_APP_IMGBB_API_KEY, expiration: 600 } });
          setForm({ ...form, imageUrl: response.data.data.url });
        } catch (error: any) {
          console.error('imgbb Upload Fehler:', error.response?.data || error.message);
        }
      }
    };
    input.click();
  };

  const handleSave = async () => {
    console.log('Gesendete Daten:', form);
    try {
      await axios.post(`${apiUrl}/wine`, form, { headers: { 'Content-Type': 'application/json' } });
      setSuccessMessage(true);
      setTimeout(() => { setSuccessMessage(false); onBack(); }, 2000);
    } catch (error: any) {
      console.error('Speicherfehler:', error.response?.data || error.message);
    }
  };

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
          {form.imageUrl && <img src={form.imageUrl} alt="Vorschau" className="w-full rounded-lg mt-4" />}
        </section>
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Wein Details</h2>
          <label className="block font-semibold text-[#496580] mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="z.B. Merlot 2020"
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          />
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Rebsorte</label>
          <input
            value={form.rebsorte}
            onChange={(e) => setForm({ ...form, rebsorte: e.target.value })}
            placeholder="z.B. Cabernet Sauvignon"
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          />
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Gekauft bei</label>
          <select
            multiple
            value={form.kauforte}
            onChange={(e) => setForm({ ...form, kauforte: Array.from(e.target.selectedOptions).map(o => o.value) })}
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] h-24 mt-1"
          >
            <option value="" disabled>Kaufort auswählen</option>
            <option value="Rewe">Rewe</option>
            <option value="Kaufland">Kaufland</option>
            <option value="Hit">Hit</option>
            <option value="Aldi">Aldi</option>
            <option value="Lidl">Lidl</option>
            <option value="Edeka">Edeka</option>
          </select>
          {successMessage && <div className="glass-alert p-3 rounded-lg mt-4">Wein erfolgreich hinzugefügt!</div>}
        </section>
      </main>
      <footer className="footer">
        <button className="footer-btn w-full text-base font-medium" onClick={handleSave}>Speichern</button>
      </footer>
    </div>
  );
};

export default AddWineScreen;