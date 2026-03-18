import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ImageKit from 'imagekit-javascript';
import PriceSlider from './PriceSlider';
import '../App.css';

interface EditWineScreenProps {
  wineId: string;
  onBack: (refresh?: boolean) => void;
  apiUrl: string;
}

interface FormWine {
  name: string; rebsorte: string; farbe: string; preis: string;
  kauforte: string[]; geschmack: string[]; kategorie: string;
  unterkategorie: string; saison: string; notizen: string;
  bewertung: number; imageUrl: string;
}

const EditWineScreen: React.FC<EditWineScreenProps> = ({ wineId, onBack, apiUrl }) => {
  const [form, setForm] = useState<FormWine>({
    name:'', rebsorte:'', farbe:'', preis:'', kauforte:[], geschmack:[],
    kategorie:'', unterkategorie:'', saison:'', notizen:'', bewertung:0, imageUrl:'',
  });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const createUrlSafeFileName = (name: string, rebsorte: string): string => {
    const transliterate = (text: string) => {
      const map: { [key: string]: string } = {
        'ä':'ae','ö':'oe','ü':'ue','ß':'ss','Ä':'Ae','Ö':'Oe','Ü':'Ue',
        'á':'a','à':'a','â':'a','ã':'a','å':'a','é':'e','è':'e','ê':'e','ë':'e',
        'í':'i','ì':'i','î':'i','ï':'i','ó':'o','ò':'o','ô':'o','õ':'o',
        'ú':'u','ù':'u','û':'u','ç':'c','ñ':'n',
        ' ':'_','-':'_','/':'_','\\':'_','(':'',')':'','[':'',']':'','{':'','}':'',
        '&':'und','+':'plus','%':'prozent','!':'','?':'','.':'',',':'',';':'',':':'',
        '"':'','\'':'','`':'','´':'','^':'','~':'','*':'','#':'','@':'','$':'','€':'euro',
      };
      return text.replace(/./g, c => map[c] || c);
    };
    const clean = (s: string) => transliterate(s)
      .replace(/[^a-zA-Z0-9_]/g,'').replace(/_+/g,'_').replace(/^_|_$/g,'').toLowerCase();
    return `${clean(name) || 'unnamed'}_${clean(rebsorte) || 'unknown'}.jpg`;
  };

  useEffect(() => {
    axios.get(`${apiUrl}/wine/${wineId}`)
      .then(res => {
        const d = res.data;
        setForm({
          name: d.name || '', rebsorte: d.rebsorte || '', farbe: d.farbe || '',
          preis: d.preis || '', kauforte: d.kauforte || [], geschmack: d.geschmack || [],
          kategorie: d.kategorie || '', unterkategorie: d.unterkategorie || '',
          saison: d.saison || '', notizen: d.notizen || '',
          bewertung: d.bewertung || 0, imageUrl: d.imageUrl || '',
        });
        setLoading(false);
      })
      .catch(err => {
        setError('Fehler beim Laden des Weins');
        setTimeout(() => setError(null), 2000);
        setLoading(false);
      });
  }, [wineId, apiUrl]);

  const compressImage = (file: File): Promise<File> =>
    new Promise(resolve => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = e => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          const maxSize = 1024;
          let [w, h] = [img.width, img.height];
          if (w > h ? w > maxSize : h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => resolve(
            blob ? new File([blob], file.name, { type:'image/jpeg', lastModified:Date.now() }) : file
          ), 'image/jpeg', 0.8);
        };
      };
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const urlEndpoint = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT;
      if (!urlEndpoint) throw new Error('REACT_APP_IMAGEKIT_URL_ENDPOINT nicht definiert');
      const imagekit = new ImageKit({ publicKey: process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY || '', urlEndpoint });
      const { data: auth } = await axios.get(`${apiUrl}/imagekit-auth`);
      const uploadResponse = await imagekit.upload({
        file: compressed, fileName: createUrlSafeFileName(form.name, form.rebsorte),
        folder: '/wines', ...auth,
      });
      setForm(prev => ({ ...prev, imageUrl: uploadResponse.url }));
    } catch (err: any) {
      setError('Fehler beim Bildupload');
      setTimeout(() => setError(null), 2000);
    } finally { setIsUploading(false); }
  };

  const handleDeleteImage = async () => {
    if (!form.imageUrl) return;
    try {
      await axios.delete(`${apiUrl}/imagekit-file`, { data: { imageUrl: form.imageUrl } });
      setForm(prev => ({ ...prev, imageUrl: '' }));
    } catch (err: any) {
      setError('Fehler beim Löschen des Bildes');
      setTimeout(() => setError(null), 2000);
    }
  };

  const isFormValid = () =>
    form.name.trim() !== '' && form.rebsorte.trim() !== '' && form.farbe.trim() !== '' &&
    form.preis.trim() !== '' && form.kauforte.length > 0 && form.kategorie.trim() !== '' &&
    form.unterkategorie.trim() !== '' && form.geschmack.length > 0 &&
    form.geschmack.length <= 3 && form.bewertung > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      setError('Bitte fülle alle Pflichtfelder aus!');
      setTimeout(() => setError(null), 2000); return;
    }
    setLoading(true);
    try {
      // Sende NUR die bearbeitbaren Felder, ohne timestamp
      // Das Backend fügt automatisch updatedAt hinzu
      const updateData = {
        name: form.name,
        rebsorte: form.rebsorte,
        farbe: form.farbe,
        preis: form.preis,
        kauforte: form.kauforte,
        geschmack: form.geschmack,
        kategorie: form.kategorie,
        unterkategorie: form.unterkategorie,
        saison: form.saison,
        notizen: form.notizen,
        bewertung: form.bewertung,
        imageUrl: form.imageUrl
        // timestamp wird NICHT mitgesendet, damit es erhalten bleibt
        // updatedAt wird vom Backend hinzugefügt
      };

      await axios.put(`${apiUrl}/wine/${wineId}`, updateData);
      setSuccessMessage('Änderungen erfolgreich gespeichert!');
      setTimeout(() => { setSuccessMessage(''); onBack(true); }, 1500);
    } catch (err: any) {
      setError('Fehler beim Speichern der Änderungen');
      setTimeout(() => setError(null), 2000);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie diesen Wein wirklich löschen?')) return;
    setLoading(true);
    try {
      if (form.imageUrl)
        await axios.delete(`${apiUrl}/imagekit-file`, { data: { imageUrl: form.imageUrl } });
      await axios.delete(`${apiUrl}/wine/${wineId}`, { headers: { 'Content-Type':'application/json' } });
      setSuccessMessage('Wein erfolgreich gelöscht!');
      setTimeout(() => { setSuccessMessage(''); onBack(true); }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response?.status === 404 ? 'Wein nicht gefunden' : 'Fehler beim Löschen');
      setError(msg); setTimeout(() => setError(null), 3000);
    } finally { setLoading(false); }
  };

  const unterkategorieOptions: { [key: string]: string[] } = {
    Evergreen:       ['schwer','leicht','Anlass'],
    Weinstand:       ['schwer','leicht','Anlass'],
    Kochwein:        ['auch trinkbar','Tafelwein','Fail'],
    'Seltene Weine': ['Geschenk','Geheimtipp','Anlass'],
  };
  const geschmackOptions = ['spritzig','fruchtig','dünn','weich','extraordinär','kräftig','intensiv','gefällig'];

  if (loading && !form.name) return <div style={{ padding:'2rem', color:'var(--color-text-secondary)' }}>Laden…</div>;

  /* Shared styles */
  const labelStyle: React.CSSProperties = {
    display:'block', fontFamily:'DM Sans, sans-serif', fontSize:'0.68rem', fontWeight:500,
    letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--color-accent)',
    marginBottom:'0.4rem', marginTop:'1.25rem',
  };
  const inputStyle: React.CSSProperties = {
    width:'100%', maxWidth:'100%', padding:'0.7rem 0.9rem',
    border:'1px solid var(--color-input-border)', borderRadius:4,
    background:'var(--color-input-bg)', color:'var(--color-text-primary)',
    fontFamily:'DM Sans, sans-serif', fontSize:'1rem',
  };

  return (
    <div className="App">
      <header className="glass-header">
        <h1 className="header-title">Wein bearbeiten</h1>
        <span className="header-back" onClick={() => onBack(false)}>Zurück</span>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center gap-6">

        {/* ── Bild ── */}
        <section className="glass-card image-upload">
          <h2>Bild</h2>
          {isUploading ? (
            <div className="loader" />
          ) : !form.imageUrl ? (
            <label className="upload-plus">
              <span className="plus-symbol">+</span>
              <input type="file" accept="image/*" className="hidden-input" onChange={handleImageUpload} />
            </label>
          ) : (
            <div style={{ position:'relative' }}>
              <img src={form.imageUrl} alt="Vorschau" className="image-preview" />
              <button
                onClick={handleDeleteImage}
                style={{
                  position:'absolute', bottom:8, right:8, width:32, height:32, borderRadius:'50%',
                  background:'var(--color-btn-danger-bg)', color:'var(--color-text-primary)',
                  border:'none', cursor:'pointer', fontSize:'0.85rem',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  maxWidth:32, margin:0, padding:0,
                }}
              >🗑</button>
            </div>
          )}
        </section>

        {/* ── Wein Details ── */}
        <section className="glass-card">
          <h2>Wein Details</h2>

          <span style={{ ...labelStyle, marginTop:0 }}>
            Gekauft bei <span style={{ color:'var(--color-accent)' }}>*</span>
          </span>
          <select multiple value={form.kauforte}
            onChange={e => setForm(prev => ({ ...prev, kauforte: Array.from(e.target.selectedOptions, o => o.value) }))}
            style={{ ...inputStyle, minHeight:120 }}>
            {['Rewe','Kaufland','Hit','Aldi','Lidl','Edeka','Henkell','Tegut','Wo anders'].map(o =>
              <option key={o} value={o}>{o}</option>
            )}
          </select>

          <span style={labelStyle}>Name <span style={{ color:'var(--color-accent)' }}>*</span></span>
          <input value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="z.B. Merlot 2020" style={inputStyle} />

          <span style={labelStyle}>Sorte <span style={{ color:'var(--color-accent)' }}>*</span></span>
          <input value={form.rebsorte}
            onChange={e => setForm(prev => ({ ...prev, rebsorte: e.target.value }))}
            placeholder="z.B. Cabernet Sauvignon" style={inputStyle} />

          <span style={labelStyle}>Farbe <span style={{ color:'var(--color-accent)' }}>*</span></span>
          <select value={form.farbe}
            onChange={e => setForm(prev => ({ ...prev, farbe: e.target.value }))}
            style={inputStyle}>
            <option value="" disabled>Farbe auswählen</option>
            <option value="Rot">Rot</option>
            <option value="Weiß">Weiß</option>
            <option value="Rosé">Rosé</option>
          </select>

          <span style={labelStyle}>Preis <span style={{ color:'var(--color-accent)' }}>*</span></span>
          <PriceSlider value={form.preis} onChange={newPrice => setForm(prev => ({ ...prev, preis: newPrice }))} />
        </section>

        {/* ── Geschmack ── */}
        <section className="glass-card geschmack-card">
          <h2>Geschmack <span style={{ color:'var(--color-accent)', fontSize:'0.9em' }}>*</span></h2>
          <div className="grid grid-cols-2 gap-4">
            {[geschmackOptions.slice(0,4), geschmackOptions.slice(4)].map((group, gi) => (
              <div key={gi} className="flex flex-col gap-4">
                {group.map(g => (
                  <label key={g} className="unterkategorie-label">
                    <input type="checkbox" checked={form.geschmack.includes(g)}
                      onChange={() => setForm(prev => {
                        if (prev.geschmack.includes(g))
                          return { ...prev, geschmack: prev.geschmack.filter(i => i !== g) };
                        if (prev.geschmack.length < 3)
                          return { ...prev, geschmack: [...prev.geschmack, g] };
                        return prev;
                      })}
                      style={{ width:18, height:18, accentColor:'var(--color-accent)', cursor:'pointer' }}
                    />
                    <span style={{ fontSize:'0.95rem', color:'var(--color-text-secondary)' }}>{g}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── Kategorie ── */}
        <section className="glass-card">
          <h2>Kategorie <span style={{ color:'var(--color-accent)', fontSize:'0.9em' }}>*</span></h2>
          <div className="grid-cols-auto-fit">
            {['Evergreen','Weinstand','Kochwein','Seltene Weine'].map(k => (
              <div key={k}
                className={`category-tile${form.kategorie === k ? ' selected' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, kategorie: k, unterkategorie: '' }))}
              >
                <span style={{ fontSize:'0.88rem', fontWeight:500 }}>{k}</span>
              </div>
            ))}
          </div>
          {form.kategorie && (
            <div style={{ marginTop:'1.25rem' }}>
              <span style={{ ...labelStyle, marginTop:0 }}>
                Unterkategorie <span style={{ color:'var(--color-accent)' }}>*</span>
              </span>
              {unterkategorieOptions[form.kategorie].map(u => (
                <label key={u} className="unterkategorie-label">
                  <input type="radio" name="unterkategorie" checked={form.unterkategorie === u}
                    onChange={() => setForm(prev => ({ ...prev, unterkategorie: u }))}
                    style={{ width:18, height:18, accentColor:'var(--color-accent)', cursor:'pointer' }}
                  />
                  <span style={{ fontSize:'0.95rem', color:'var(--color-text-secondary)' }}>{u}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* ── Saison ── */}
        <section className="glass-card">
          <h2>Saison</h2>
          {['Sommer','Winter'].map(s => (
            <label key={s} className="unterkategorie-label" style={{ cursor:'pointer' }}>
              <input type="radio" name="saison" checked={form.saison === s}
                onChange={() => setForm(prev => ({ ...prev, saison: prev.saison === s ? '' : s }))}
                style={{ width:18, height:18, accentColor:'var(--color-accent)', cursor:'pointer' }}
              />
              <span style={{ fontSize:'0.95rem', color:'var(--color-text-secondary)' }}>{s}</span>
            </label>
          ))}
        </section>

        {/* ── Bewertung ── */}
        <section className="glass-card bewertung-card">
          <h2>Bewertung <span style={{ color:'var(--color-accent)', fontSize:'0.9em' }}>*</span></h2>
          <div className="flex flex-row gap-2 flex-nowrap">
            {[1,2,3,4,5].map(star => (
              <svg key={star}
                style={{
                  width:32, height:32, cursor:'pointer', flexShrink:0,
                  fill:   star <= form.bewertung ? 'var(--color-star-active)' : 'none',
                  stroke: star <= form.bewertung ? 'var(--color-star-active)' : 'var(--color-star-inactive)',
                  strokeWidth: 1.5,
                }}
                onClick={() => setForm(prev => ({ ...prev, bewertung: star }))}
                viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </section>

        {/* ── Notizen ── */}
        <section className="glass-card">
          <h2>Notizen</h2>
          <textarea value={form.notizen}
            onChange={e => setForm(prev => ({ ...prev, notizen: e.target.value }))}
            placeholder="Freitext für Notizen…"
            style={{ ...inputStyle, height:96, resize:'vertical' }}
          />
        </section>
      </main>

      <footer className="footer">
        <div style={{ display:'flex', justifyContent:'space-between', width:'100%', gap:'1rem' }}>
          <button className="footer-btn danger" onClick={handleDelete} disabled={loading || isUploading}>
            Löschen
          </button>
          <button className="footer-btn" onClick={handleSubmit} disabled={loading || isUploading}>
            Speichern
          </button>
        </div>
      </footer>

      {successMessage && <div className="snackbar success">{successMessage}</div>}
      {error          && <div className="snackbar error">{error}</div>}
    </div>
  );
};

export default EditWineScreen;