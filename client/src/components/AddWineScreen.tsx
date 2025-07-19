import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

interface AddWineScreenProps {
  onBack: () => void;
  apiUrl: string;
}

const AddWineScreen: React.FC<AddWineScreenProps> = ({ onBack, apiUrl }) => {
  const [form, setForm] = useState({ name: '', rebsorte: '', imageUrl: '', kauforte: [] as string[] });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const handleImageUpload = async (source: 'camera' | 'gallery') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment'; // Öffnet Kamera
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setSelectedImage(file);
        const formData = new FormData();
        formData.append('image', file);
        try {
          const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            params: {
              key: process.env.REACT_APP_IMGBB_API_KEY,
            },
          });
          setForm({ ...form, imageUrl: response.data.data.url });
        } catch (error) {
          console.error('imgbb Upload Fehler:', error);
        }
      }
    };
    input.click();
  };

  const handleSave = async () => {
    await axios.post(`${apiUrl}/wine`, form);
    onBack();
  };

  return (
    <div className="App">
      <main className="card">
        <h2 className="text-accent">Wein hinzufügen</h2>
        <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button className="btn-primary" onClick={() => handleImageUpload('camera')}>+</button>
          <p>Foto</p>
        </div>
        <select
          multiple
          value={form.kauforte}
          onChange={(e) => {
            const options = Array.from(e.target.selectedOptions).map(o => o.value);
            setForm({ ...form, kauforte: options });
          }}
        >
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