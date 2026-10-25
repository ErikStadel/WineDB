import React, { useState, useRef, useEffect } from 'react';

interface KauforteDropdownProps {
  value: string[];
  onChange: (newValue: string[]) => void;
  options?: string[];
  placeholder?: string;
}

const DEFAULT_OPTIONS = [
  'Rewe',
  'Kaufland',
  'Hit',
  'Aldi',
  'Lidl',
  'Globus',
  'Henkell',
  'Weinfreunde',
  'Wo anders',
  'Im Glas',
];

const KauforteDropdown: React.FC<KauforteDropdownProps> = ({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  placeholder = 'Kaufort auswählen',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Merge default options with any existing values (e.g. legacy entries when editing)
  const allOptions = Array.from(new Set([...options, ...value]));

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(item => item !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="kaufort-dropdown" ref={containerRef}>
      <button
        type="button"
        className={`kaufort-dropdown-trigger${isOpen ? ' open' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={`kaufort-dropdown-value${value.length === 0 ? ' placeholder' : ''}`}
        >
          {value.length > 0 ? value.join(', ') : placeholder}
        </span>
        <span className="kaufort-dropdown-meta">
          {value.length > 0 && (
            <span className="kaufort-dropdown-badge">{value.length}</span>
          )}
          <span className="kaufort-dropdown-chevron">{isOpen ? '▲' : '▼'}</span>
        </span>
      </button>

      {isOpen && (
        <div className="kaufort-dropdown-menu" role="listbox" aria-multiselectable="true">
          <div className="kaufort-dropdown-list">
            {allOptions.map(option => {
              const isSelected = value.includes(option);
              return (
                <div
                  key={option}
                  role="option"
                  aria-selected={isSelected}
                  className={`kaufort-dropdown-item${isSelected ? ' selected' : ''}`}
                  onClick={() => toggleOption(option)}
                >
                  <span>{option}</span>
                  <span className="kaufort-dropdown-check" aria-hidden="true">
                    {isSelected ? '✓' : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="kaufort-dropdown-footer">
            {value.length > 0 ? (
              <span
                className="kaufort-dropdown-clear"
                onClick={() => onChange([])}
              >
                Auswahl zurücksetzen
              </span>
            ) : (
              <span />
            )}
            <span
              className="kaufort-dropdown-done"
              onClick={() => setIsOpen(false)}
            >
              Fertig
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default KauforteDropdown;
