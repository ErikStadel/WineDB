import React, { useState, useEffect } from 'react';

interface PriceSliderProps {
  value: string;
  onChange: (value: string) => void;
}

const PriceSlider: React.FC<PriceSliderProps> = ({ value, onChange }) => {
  const priceOptions = [
    'unter 5 €','5 €','6 €','7 €','8 €','9 €','10 €','11 €','12 €','ueber 12 €'
  ];
  const displayLabels = [
    '<5 €','5 €','6 €','7 €','8 €','9 €','10 €','11 €','12 €','>12 €'
  ];

  const convertLegacyPrice = (old: string): string => {
    const map: { [k: string]: string } = {
      '5-8 €':'6 €','8-12 €':'10 €','12-15 €':'12 €','ueber 15 €':'ueber 12 €',
      'unter 5 €':'unter 5 €','5 €':'5 €','6 €':'6 €','7 €':'7 €','8 €':'8 €',
      '9 €':'9 €','10 €':'10 €','11 €':'11 €','12 €':'12 €','ueber 12 €':'ueber 12 €',
    };
    return map[old] || 'unter 5 €';
  };

  const getCurrentIndex = () => {
    const idx = priceOptions.findIndex(p => p === convertLegacyPrice(value));
    return idx !== -1 ? idx : 0;
  };

  const [sliderValue, setSliderValue] = useState(getCurrentIndex());

  useEffect(() => { setSliderValue(getCurrentIndex()); }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value);
    setSliderValue(idx);
    onChange(priceOptions[idx]);
  };

  return (
    <div style={{ width:'100%', padding:'0.5rem 0' }}>
      {/* Display */}
      <div style={{
        textAlign:'center', marginBottom:'1rem', padding:'0.75rem',
        background:'var(--color-accent-dim)',
        borderRadius:6,
        border:'1px solid var(--color-glass-border)',
      }}>
        <span style={{
          fontSize:'1.25rem', fontWeight:600,
          fontFamily:'DM Sans, sans-serif',
          color:'var(--color-accent)',
        }}>
          {displayLabels[sliderValue]}
        </span>
      </div>

      {/* Slider */}
      <input type="range" min="0" max={priceOptions.length - 1}
        value={sliderValue} onChange={handleSliderChange} step="1"
        style={{ width:'100%', maxWidth:'100%', border:'none' }}
      />

      {/* Marks */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.4rem', padding:'0 0.25rem' }}>
        {[displayLabels[0], displayLabels[Math.floor(priceOptions.length / 2)], displayLabels[priceOptions.length - 1]].map((m, i) => (
          <span key={i} style={{
            fontSize:'0.72rem', color:'var(--color-text-muted)',
            fontFamily:'DM Sans, sans-serif', fontWeight:500,
          }}>{m}</span>
        ))}
      </div>

      <style>{`
        /* Slider thumb — uses CSS vars where possible */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid var(--color-bg-mid);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid var(--color-bg-mid);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }
        @media (hover: none) and (pointer: coarse) {
          input[type="range"]::-webkit-slider-thumb,
          input[type="range"]::-moz-range-thumb {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>
    </div>
  );
};

export default PriceSlider;