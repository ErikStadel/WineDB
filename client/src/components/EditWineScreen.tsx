import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { mockWines } from '../mocks/mockWines';
import { Wine } from '../types/Wine';
import '../App.css';

interface EditWineScreenProps {
  wineId: string;
  onBack: (refresh?: boolean) => void;
  apiUrl: string;
}

interface FormWine extends Omit<Wine, '_id' | 'timestamp'> {
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
}

const EditWineScreen: React.FC<EditWineScreenProps> = ({ wineId, onBack, apiUrl }) => {
  const [form, setForm] = useState<FormWine>({
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
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';
    
    if (useMockData) {
      const mockWine = mockWines.find((w: Wine) => w._id.$oid === wineId);
      if (mockWine) {
        setForm({
          name: mockWine.name || '',
          rebsorte: mockWine.rebsorte || '',
          farbe: mockWine.farbe || '',
          preis: mockWine.preis || '',
          kauforte: mockWine.kauforte || [],
          geschmack: mockWine.geschmack || [],
          kategorie: mockWine.kategorie || '',
          unterkategorie: mockWine.unterkategorie || '',
          notizen: mockWine.notizen || '',
          bewertung: mockWine.bewertung || 0,
          imageUrl: mockWine.imageUrl || '',
        });
      } else {
        setError('Wein nicht gefunden');
      }
      setLoading(false);
    } else {
      axios.get(`${apiUrl}/wine/${wineId}`)
        .then(res => {
          const wineData = res.data as Wine;
          setForm({
            name: wineData.name || '',
            rebsorte: wineData.rebsorte || '',
            farbe: wineData.farbe || '',
            preis: wineData.preis || '',
            kauforte: wineData.kauforte || [],
            geschmack: wineData.geschmack || [],
            kategorie: wineData.kategorie || '',
            unterkategorie: wineData.unterkategorie || '',
            notizen: wineData.notizen || '',
            bewertung: wineData.bewertung || 0,
            imageUrl: wineData.imageUrl || '',
          });
          setLoading(false);
        })
        .catch(err => {
          setError('Fehler beim Laden der Weindaten');
          setLoading(false);
        });
    }
  }, [wineId, apiUrl]);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          const maxSize = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append('image', compressedFile);
        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
          params: { key: process.env.REACT_APP_IMGBB_API_KEY},
        });
        const imageUrl = response.data.data.url;
        setForm((prevForm) => ({ ...prevForm, imageUrl }));
      } catch (error: any) {
        setError('Fehler beim Bildupload');
        setTimeout(() => setError(null), 2000);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeleteImage = () => {
    setForm((prevForm) => ({ ...prevForm, imageUrl: '' }));
  };

  const handleGeschmackChange = (value: string) => {
    setForm((prevForm) => {
      if (prevForm.geschmack.includes(value)) {
        return { ...prevForm, geschmack: prevForm.geschmack.filter(g => g !== value) };
      } else if (prevForm.geschmack.length < 3) {
        return { ...prevForm, geschmack: [...prevForm.geschmack, value] };
      }
      return prevForm;
    });
  };

  const handleKategorieChange = (kategorie: string) => {
    setForm((prevForm) => ({ ...prevForm, kategorie, unterkategorie: '' }));
  };

  const handleUnterkategorieChange = (unterkategorie: string) => {
    setForm((prevForm) => ({ ...prevForm, unterkategorie }));
  };

  const handleBewertungChange = (bewertung: number) => {
    setForm((prevForm) => ({ ...prevForm, bewertung }));
  };

  const handleKauforteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setForm((prevForm) => ({ ...prevForm, kauforte: selectedOptions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!isFormValid()) {
    setError('Bitte fülle alle Pflichtfelder aus!');
    setTimeout(() => setError(null), 2000);
    return;
  }
  setLoading(true);
  setError(null);

  const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';
  
  if (useMockData) {
    const mockIndex = mockWines.findIndex((w: Wine) => w._id.$oid === wineId);
    if (mockIndex !== -1) {
      mockWines[mockIndex] = {
        ...mockWines[mockIndex],
        ...form,
        _id: { $oid: wineId },
        timestamp: { $date: new Date().toISOString() }
      };
    }
    setSuccessMessage('Änderungen erfolgreich gespeichert!');
    setTimeout(() => {
      setSuccessMessage('');
      onBack(true); // Trigger refresh
    }, 1500);
  } else {
    try {
      await axios.put(`${apiUrl}/wine/${wineId}`, {
        ...form,
        _id: { $oid: wineId }
      });
      setSuccessMessage('Änderungen erfolgreich gespeichert!');
      setTimeout(() => {
        setSuccessMessage('');
        onBack(true); // Trigger refresh
      }, 1500);
    } catch (err) {
      setError('Fehler beim Speichern der Änderungen');
      setTimeout(() => setError(null), 2000);
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
    if (mockIndex === -1) {
      setError('Wein nicht gefunden');
      setLoading(false);
      setTimeout(() => setError(null), 2000);
      return;
    }
    mockWines.splice(mockIndex, 1);
    setSuccessMessage('Wein erfolgreich gelöscht!');
    setTimeout(() => {
      setSuccessMessage('');
      onBack(true); // Trigger refresh
    }, 1500);
    setLoading(false);
  } else {
    try {
      console.log('Lösche Wein mit ID:', wineId);
      
      const response = await axios.delete(`${apiUrl}/wine/${wineId}`, {
        headers: { 
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Lösch-Response:', response.data);
      setSuccessMessage('Wein erfolgreich gelöscht!');
      
      setTimeout(() => {
        setSuccessMessage('');
        onBack(true); // Trigger refresh
      }, 1500);
      
    } catch (err: any) {
      console.error('Löschfehler Details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      
      let errorMessage = 'Fehler beim Löschen des Weins';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 404) {
        errorMessage = 'Wein nicht gefunden';
      } else if (err.response?.status === 400) {
        errorMessage = 'Ungültige Wein-ID';
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  }
};

  const isFormValid = () => {
    return (
      form.name.trim() !== '' &&
      form.rebsorte.trim() !== '' &&
      form.farbe.trim() !== '' &&
      form.preis.trim() !== '' &&
      form.kauforte.length > 0 &&
      form.kategorie.trim() !== '' &&
      form.unterkategorie.trim() !== '' &&
      form.geschmack.length > 0 &&
      form.geschmack.length <= 3 &&
      form.bewertung > 0
    );
  };

  const unterkategorieOptions: { [key: string]: string[] } = {
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

  if (loading) return <div>Laden...</div>;
  if (error && !isUploading) return <div className="snackbar error">{error}</div>;

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein bearbeiten</h1>
        <span className="header-back" onClick={() => onBack(false)}>Zurück</span>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center gap-12">
        <section className="glass-card image-upload">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Bild hinzufügen</h2>
          {isUploading ? (
            <div className="loader" />
          ) : !form.imageUrl ? (
            <label className="upload-plus">
              <span className="plus-symbol">+</span>
              <input
                id="library-input"
                type="file"
                accept="image/*"
                className="hidden-input"
                onChange={handleImageUpload}
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={form.imageUrl}
                alt="Vorschau"
                className="image-preview"
              />
              <button
                onClick={handleDeleteImage}
                className="absolute bottom-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
              >
                🗑
              </button>
            </div>
          )}
        </section>
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Wein Details</h2>
          <label className="block font-semibold text-[#496580] mb-1">Gekauft bei <span className="text-red-500">*</span></label>
          <select
            multiple
            value={form.kauforte}
            onChange={handleKauforteChange}
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          >
            <option value="Rewe">Rewe</option>
            <option value="Kaufland">Kaufland</option>
            <option value="Hit">Hit</option>
            <option value="Aldi">Aldi</option>
            <option value="Lidl">Lidl</option>
            <option value="Edeka">Edeka</option>
            <option value="Henkell">Henkell</option>
            <option value="Wo anders">Wo anders</option>
          </select>
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Name <span className="text-red-500">*</span></label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="z.B. Merlot 2020"
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          />
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Sorte <span className="text-red-500">*</span></label>
          <input
            value={form.rebsorte}
            onChange={(e) => setForm((prev) => ({ ...prev, rebsorte: e.target.value }))}
            placeholder="z.B. Cabernet Sauvignon"
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          />
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Farbe <span className="text-red-500">*</span></label>
          <select
            value={form.farbe}
            onChange={(e) => setForm((prev) => ({ ...prev, farbe: e.target.value }))}
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          >
            <option value="" disabled>Farbe auswählen</option>
            <option value="Rot">Rot</option>
            <option value="Weiß">Weiß</option>
            <option value="Rosé">Rosé</option>
          </select>
          <label className="block font-semibold text-[#496580] mb-1 mt-4">Preis <span className="text-red-500">*</span></label>
          <select
            value={form.preis}
            onChange={(e) => setForm((prev) => ({ ...prev, preis: e.target.value }))}
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          >
            <option value="" disabled>Preis auswählen</option>
            <option value="unter 5 €">{'<5 €'}</option>
            <option value="5-8 €">5-8 €</option>
            <option value="8-12 €">8-12 €</option>
            <option value="12-15 €">12-15 €</option>
            <option value="ueber 15 €">{'>15 €'}</option>
          </select>
        </section>
        <section className="glass-card geschmack-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Geschmack <span className="text-red-500">*</span></h2>
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
          <h2 className="text-lg md:text-xl font-semibold mb-4">Kategorie <span className="text-red-500">*</span></h2>
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
              <h3 className="text-base font-semibold text-[#496580] mb-2">Unterkategorie <span className="text-red-500">*</span></h3>
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
          <h2 className="text-lg md:text-xl font-semibold mb-4">Bewertung <span className="text-red-500">*</span></h2>
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
        <section className="glass-card">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Notizen</h2>
          <textarea
            value={form.notizen}
            onChange={(e) => setForm((prev) => ({ ...prev, notizen: e.target.value }))}
            placeholder="Freitext für Notizen..."
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1 h-24"
          />
        </section>
      </main>
      <footer className="footer">
        <div className="flex justify-between w-full gap-4">
          <button
            className="footer-btn bg-red-500 hover:bg-red-600"
            onClick={handleDelete}
            disabled={loading || isUploading}
          >
            Löschen
          </button>
          <button
            className="footer-btn"
            onClick={handleSubmit}
            disabled={loading || isUploading}
          >
            Speichern
          </button>
        </div>
      </footer>
      {successMessage && (
  <div className="snackbar success">
    {successMessage}
  </div>
)}
      {error && (
        <div className="snackbar error">
          {error}
        </div>
      )}
    </div>
  );
};

export default EditWineScreen;