import React, { useState } from 'react';
import axios from 'axios';
import ImageKit from 'imagekit-javascript';
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
    imageFile: File | null;
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
    imageFile: null,
    imageUrl: ''
  });
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // URL-sichere Dateinamen erstellen
  const createUrlSafeFileName = (name: string, rebsorte: string): string => {
    const transliterate = (text: string): string => {
      const map: { [key: string]: string } = {
        'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
        'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
        'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u',
        'ç': 'c', 'ñ': 'n',
        ' ': '_', '-': '_', '/': '_', '\\': '_',
        '(': '', ')': '', '[': '', ']': '', '{': '', '}': '',
        '&': 'und', '+': 'plus', '%': 'prozent',
        '!': '', '?': '', '.': '', ',': '', ';': '', ':': '',
        '"': '', "'": '', '`': '', '´': '', '^': '', '~': '',
        '*': '', '#': '', '@': '', '$': '', '€': 'euro'
      };
      
      return text.replace(/./g, char => map[char] || char);
    };
    
    const cleanName = transliterate(name)
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
    
    const cleanRebsorte = transliterate(rebsorte)
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
    
    const finalName = cleanName || 'unnamed';
    const finalRebsorte = cleanRebsorte || 'unknown';
    
    return `${finalName}_${finalRebsorte}.jpg`;
  };

  const compressImage = async (file: File): Promise<File> => {
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
        const previewUrl = URL.createObjectURL(compressedFile);
        setForm((prevForm) => ({
          ...prevForm,
          imageFile: compressedFile,
          imageUrl: previewUrl
        }));
      } catch (error: any) {
        console.error('Bildkomprimierung Fehler:', error.message);
        setErrorMessage(true);
        setTimeout(() => setErrorMessage(false), 2000);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeleteImage = () => {
    if (form.imageUrl) {
      URL.revokeObjectURL(form.imageUrl);
    }
    setForm((prevForm) => ({
      ...prevForm,
      imageFile: null,
      imageUrl: ''
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.name ||
      !form.rebsorte ||
      !form.farbe ||
      !form.preis ||
      form.kauforte.length === 0 ||
      !form.kategorie ||
      !form.unterkategorie ||
      form.geschmack.length === 0 ||
      form.bewertung === 0
    ) {
      setErrorMessage(true);
      setTimeout(() => setErrorMessage(false), 2000);
      return;
    }

    setIsSaving(true);
    setErrorMessage(false);

    try {
      let imageUrl = form.imageUrl;

      // Bild hochladen, falls vorhanden
      if (form.imageFile) {
        const urlEndpoint = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT;
        if (!urlEndpoint) {
          throw new Error('REACT_APP_IMAGEKIT_URL_ENDPOINT ist nicht definiert');
        }
        const publicKey = process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY || '';
        const imagekit = new ImageKit({
          publicKey,
          urlEndpoint
        });

        // URL-sicheren Dateinamen erstellen
        const fileName = createUrlSafeFileName(form.name, form.rebsorte);

        const authResponse = await axios.get(`${apiUrl}/imagekit-auth`);
        const { token, expire, signature } = authResponse.data;

        const uploadOptions = {
          file: form.imageFile,
          fileName,
          folder: '/wines',
          token,
          expire,
          signature,
          overwriteFile: true // Überschreibt Datei mit gleichem Namen automatisch
        };

        const uploadResponse = await imagekit.upload(uploadOptions);
        imageUrl = uploadResponse.url;
      }

      // Wein in MongoDB speichern (ohne imageFileId)
      await axios.post(`${apiUrl}/wine`, {
        name: form.name,
        rebsorte: form.rebsorte,
        farbe: form.farbe,
        preis: form.preis,
        kauforte: form.kauforte,
        geschmack: form.geschmack,
        kategorie: form.kategorie,
        unterkategorie: form.unterkategorie,
        notizen: form.notizen,
        bewertung: form.bewertung,
        imageUrl
      });

      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
        setForm({
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
          imageFile: null,
          imageUrl: ''
        });
        onBack();
      }, 1500);
    } catch (error: any) {
      console.error('Speichern Fehler:', error.message);
      setErrorMessage(true);
      setTimeout(() => setErrorMessage(false), 2000);
    } finally {
      setIsSaving(false);
      if (form.imageUrl && !form.imageFile) {
        URL.revokeObjectURL(form.imageUrl);
      }
    }
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

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Neuer Wein</h1>
        <span className="header-back" onClick={onBack}>Zurück</span>
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
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              setForm((prev) => ({ ...prev, kauforte: selectedOptions }));
            }}
            className="w-full p-2 border border-[#496580] rounded-lg bg-transparent text-[#496580] focus:outline-none focus:ring-2 focus:ring-[#baddff] mt-1"
          >
            <option value="Rewe">Rewe</option>
            <option value="Kaufland">Kaufland</option>
            <option value="Hit">Hit</option>
            <option value="Aldi">Aldi</option>
            <option value="Lidl">Lidl</option>
            <option value="Edeka">Edeka</option>
            <option value="Henkell">Henkell</option>
            <option value="Tegut">Tegut</option>
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
                    onChange={() => {
                      setForm((prevForm) => {
                        if (prevForm.geschmack.includes(g)) {
                          return { ...prevForm, geschmack: prevForm.geschmack.filter(item => item !== g) };
                        } else if (prevForm.geschmack.length < 3) {
                          return { ...prevForm, geschmack: [...prevForm.geschmack, g] };
                        }
                        return prevForm;
                      });
                    }}
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
                    onChange={() => {
                      setForm((prevForm) => {
                        if (prevForm.geschmack.includes(g)) {
                          return { ...prevForm, geschmack: prevForm.geschmack.filter(item => item !== g) };
                        } else if (prevForm.geschmack.length < 3) {
                          return { ...prevForm, geschmack: [...prevForm.geschmack, g] };
                        }
                        return prevForm;
                      });
                    }}
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
                onClick={() => setForm((prev) => ({ ...prev, kategorie: k, unterkategorie: '' }))}
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
                      onChange={() => setForm((prev) => ({ ...prev, unterkategorie: u }))}
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
                onClick={() => setForm((prev) => ({ ...prev, bewertung: star }))}
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
        <div className="flex justify-end w-full">
          <button
            className="footer-btn"
            onClick={handleSave}
            disabled={isSaving || isUploading}
          >
            Speichern
          </button>
        </div>
      </footer>
      {successMessage && (
        <div className="snackbar success">Wein erfolgreich hinzugefügt!</div>
      )}
      {errorMessage && (
        <div className="snackbar error">Bitte fülle alle Pflichtfelder aus!</div>
      )}
    </div>
  );
};

export default AddWineScreen;