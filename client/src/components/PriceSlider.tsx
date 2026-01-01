// Speichere diese Komponente als: client/src/components/PriceSlider.tsx

import React, { useState } from 'react';

interface PriceSliderProps {
  value: string;
  onChange: (value: string) => void;
}

const PriceSlider: React.FC<PriceSliderProps> = ({ value, onChange }) => {
  const priceOptions = [
    'unter 5 €',
    '5 €',
    '6 €',
    '7 €',
    '8 €',
    '9 €',
    '10 €',
    '11 €',
    '12 €',
    'ueber 12 €'
  ];

  const displayLabels = [
    '<5 €',
    '5 €',
    '6 €',
    '7 €',
    '8 €',
    '9 €',
    '10 €',
    '11 €',
    '12 €',
    '>12 €'
  ];

  // Finde den Index des aktuellen Werts
  const getCurrentIndex = () => {
    const index = priceOptions.findIndex(p => p === value);
    return index !== -1 ? index : 0;
  };

  const [sliderValue, setSliderValue] = useState(getCurrentIndex());

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value);
    setSliderValue(newIndex);
    onChange(priceOptions[newIndex]);
  };

  return (
    <div className="price-slider-container">
      <div className="price-slider-display">
        <span className="price-slider-label">{displayLabels[sliderValue]}</span>
      </div>
      <input
        type="range"
        min="0"
        max={priceOptions.length - 1}
        value={sliderValue}
        onChange={handleSliderChange}
        className="price-slider"
        step="1"
      />
      <div className="price-slider-marks">
        <span className="price-mark">{displayLabels[0]}</span>
        <span className="price-mark">{displayLabels[Math.floor(priceOptions.length / 2)]}</span>
        <span className="price-mark">{displayLabels[priceOptions.length - 1]}</span>
      </div>
      
      <style>{`
        .price-slider-container {
          width: 100%;
          padding: 0.5rem 0;
        }

        .price-slider-display {
          text-align: center;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: rgba(186, 221, 255, 0.2);
          border-radius: 12px;
          border: 2px solid rgba(186, 221, 255, 0.4);
        }

        .price-slider-label {
          font-size: 1.25rem;
          font-weight: 600;
          color: #496580;
        }

        .price-slider {
          width: 100%;
          height: 8px;
          border-radius: 8px;
          background: linear-gradient(
            to right,
            rgba(186, 221, 255, 0.3) 0%,
            rgba(186, 221, 255, 0.6) 50%,
            #baddff 100%
          );
          outline: none;
          -webkit-appearance: none;
          appearance: none;
          cursor: pointer;
          margin: 1rem 0;
        }

        .price-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #496580;
          cursor: pointer;
          border: 3px solid #baddff;
          box-shadow: 0 2px 8px rgba(73, 101, 128, 0.3);
          transition: all 0.2s ease;
        }

        .price-slider::-webkit-slider-thumb:active {
          transform: scale(1.2);
          box-shadow: 0 3px 12px rgba(73, 101, 128, 0.4);
        }

        .price-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #496580;
          cursor: pointer;
          border: 3px solid #baddff;
          box-shadow: 0 2px 8px rgba(73, 101, 128, 0.3);
          transition: all 0.2s ease;
        }

        .price-slider::-moz-range-thumb:active {
          transform: scale(1.2);
          box-shadow: 0 3px 12px rgba(73, 101, 128, 0.4);
        }

        .price-slider-marks {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          padding: 0 0.25rem;
        }

        .price-mark {
          font-size: 0.75rem;
          color: #496580;
          opacity: 0.7;
          font-weight: 500;
        }

        /* Touch-optimiert für Mobile */
        @media (hover: none) and (pointer: coarse) {
          .price-slider::-webkit-slider-thumb {
            width: 32px;
            height: 32px;
          }

          .price-slider::-moz-range-thumb {
            width: 32px;
            height: 32px;
          }

          .price-slider {
            height: 10px;
            margin: 1.5rem 0;
          }
        }

        @media (max-width: 640px) {
          .price-slider-label {
            font-size: 1.1rem;
          }

          .price-mark {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PriceSlider;