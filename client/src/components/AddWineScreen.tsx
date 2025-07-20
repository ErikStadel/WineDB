import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

interface AddWineScreenProps {
  onBack: () => void;
  apiUrl: string;
}

const AddWineScreen: React.FC<AddWineScreenProps> = ({ onBack, apiUrl }) => {
  const [form, setForm] = useState({ name: '', rebsorte: '', imageUrl: '', kauforte: [] as string[] });

  const handleImageUpload = async (e: React.MouseEvent) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        console.log('Verwendeter API-Key:', process.env.REACT_APP_IMGBB_API_KEY);
        try {
          const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            params: {
              key: process.env.REACT_APP_IMGBB_API_KEY,
              expiration: 600,
            },
          });
          setForm({ ...form, imageUrl: response.data.data.url });
          console.log('Imgbb Link:', response.data.data.url);
        } catch (error: any) {
          console.error('imgbb Upload Fehler:', error.response?.data || error.message);
        }
      }
    };
    input.click();
  };

  const handleSave = async () => {
    console.log('Gesendete Daten vor Submit:', form);
    try {
      await axios.post(`${apiUrl}/wine`, form, {
        headers: { 'Content-Type': 'application/json' },
      });
      onBack();
    } catch (error: any) {
      console.error('Speicherfehler:', error.response?.data || error.message);
    }
  };

  return (
    <div className="App">
      <main className="card">
        <button className="btn-outline" onClick={onBack} style={{ marginBottom: '1rem' }}>Zurück</button>
        <h2 className="text-accent">Wein hinzufügen</h2>
        <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button className="btn-primary" onClick={handleImageUpload}>+</button>
          <p>Foto</p>
        </div>
        <select
          multiple
          value={form.kauforte}
          onChange={(e) => {
            const options = Array.from(e.target.selectedOptions).map(o => o.value);
            setForm({ ...form, kauforte: options });
          }}
          style={{ color: 'var(--color-text)' }} // Um den Standardtext sichtbar zu machen
        >
          <option value="" disabled selected>Kaufort</option>
          <option value="Rewe">Rewe</option>
          <option value="Kaufland">Kaufland</option>
          <option value="Hit">Hit</option>
          <option value="Aldi">Aldi</option>
          <option value="Lidl">Lidl</option>
          <option value="Edeka">Edeka</option>
        </select>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Name"
        />
        <input
          value={form.rebsorte}
          onChange={(e) => setForm({ ...form, rebsorte: e.target.value })}
          placeholder="Rebsorte"
        />
      </main>
      <footer style={{ position: 'sticky', bottom: 0, background: '#fff', padding: '1rem', textAlign: 'center' }}>
        <button className="btn-primary" onClick={handleSave} style={{ margin: '0 auto' }}>Speichern</button>
      </footer>
    </div>
  );
};

export default AddWineScreen;