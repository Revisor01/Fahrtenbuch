import React, { useState, useRef, useEffect } from 'react';

function AddressAutocomplete({ value, onChange, placeholder = 'Adresse eingeben', className = '', required = false, name }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimer = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const fetchSuggestions = (query) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query || query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=de&limit=5&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Fahrtenbuch-App/1.3 (kkd-fahrtenbuch.de)'
          }
        });
        const data = await res.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
      } catch (err) {
        console.error('Nominatim fetch error:', err);
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    fetchSuggestions(val);
  };

  const handleSelect = (suggestion) => {
    onChange(suggestion.display_name);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`form-input ${className}`}
        placeholder={placeholder}
        required={required}
        name={name}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.place_id || i}
              onClick={() => handleSelect(s)}
              className="px-3 py-2 cursor-pointer text-sm text-value hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressAutocomplete;
