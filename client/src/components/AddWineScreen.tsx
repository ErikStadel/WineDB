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
    <div className="min-h-screen flex flex-col font-sans bg-[#ffdbbb] text-[#496580]">
      <header className="glass-header p-4 flex justify-between items-center rounded-b-xl">
        <h1 className="text-xl md:text-2xl font-semibold text-[#ffffff]">Wein Hinzufügen</h1>
        <button className="text-[#ffffff] hover:text-[#baddff] font-medium transition-colors" onClick={onBack}>Zurück</button>
      </header>
      <main className="flex-1 p-4">
        <div className="glass-card p-4 mx-auto max-w-md space-y-6">
          <h2 className="text-lg md:text-xl font-semibold mb-2">Neuen Wein hinzufügen</h2>
          <button className="btn-primary w-full text-base font-medium" onClick={handleImageUpload}>+</button>
          {form.imageUrl && <img src={form.imageUrl} alt="Vorschau" className="w-full rounded-lg mt-2" />}
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Merlot 2020" className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]" />
          <input value={form.rebsorte} onChange={(e) => setForm({ ...form, rebsorte: e.target.value })} placeholder="z.B. Cabernet Sauvignon" className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff]" />
          <select multiple value={form.kauforte} onChange={(e) => setForm({ ...form, kauforte: Array.from(e.target.selectedOptions).map(o => o.value) })} className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] h-24">
            <option value="" disabled>Kaufort auswählen</option>
            <option value="Rewe">Rewe</option>
            <option value="Kaufland">Kaufland</option>
            <option value="Hit">Hit</option>
            <option value="Aldi">Aldi</option>
            <option value="Lidl">Lidl</option>
            <option value="Edeka">Edeka</option>
          </select>
          <button className="btn-primary w-full text-base font-medium" onClick={handleSave}>Speichern</button>
          {successMessage && <div className="glass-alert p-3 rounded-lg">Wein erfolgreich hinzugefügt!</div>}
        </div>
      </main>
      <footer className="bg-[#496580] text-[#ffffff] text-center p-2 rounded-t-xl">
        <p className="text-sm">Entwickelt mit Liebe zum Wein</p>
      </footer>
    </div>
  );
};

export default AddWineScreen;