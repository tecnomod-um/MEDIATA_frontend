import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import AutoCompleteInputStyles from "./autoCompleteInput.module.css";

function AutocompleteInput({  value,  onChange,  placeholder,  className,  suggestions = [],  limitInitial = true}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [listStyles, setListStyles] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    if (suggestions.length > 0 && value && limitInitial) {
      const lowerVal = value.toLowerCase();
      setFiltered(suggestions.filter((sugg) => sugg.toLowerCase().includes(lowerVal)));
    } else 
      setFiltered(suggestions);
  }, [value, suggestions, limitInitial]);

  useEffect(() => {
    if (document.activeElement === inputRef.current && suggestions.length > 0)
      setShowSuggestions(true);
  }, [suggestions]);

  useEffect(() => {
    if (document.activeElement === inputRef.current && filtered.length > 0)
      setShowSuggestions(true);
  }, [filtered]);

  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
  
      const spaceAbove = rect.top - 10;
      const spaceBelow = window.innerHeight - rect.bottom - 10;
      const preferredHeight = 250;
  
      const fitsBelow = spaceBelow >= 100;
      const showAbove = !fitsBelow && spaceAbove > spaceBelow;
      const maxHeight = Math.min(showAbove ? spaceAbove : spaceBelow, preferredHeight);

      setListStyles({
        position: "fixed",
        top: showAbove ? undefined : rect.bottom,
        left: rect.left,
        width: rect.width,
        bottom: showAbove ? window.innerHeight - rect.top : undefined,
        maxHeight,
        overflowY: "auto",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        zIndex: 1000,
      });
    }
  }, [showSuggestions]);
  
  // Hide the list when scrolling
  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
  
    const handleScroll = () => {
      const rect = inputEl.getBoundingClientRect();
      const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!isInViewport) {
        console.log("Input scrolled out, triggering blur");
        inputEl.blur();
      }
    };
  
    // Find scrollable parents
    const scrollContainers = [];
    let node = inputEl.parentElement;
    while (node && node !== document.body) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') 
        scrollContainers.push(node);
      node = node.parentElement;
    }
  
    scrollContainers.forEach(container => container.addEventListener('scroll', handleScroll));
    window.addEventListener('scroll', handleScroll, true);
  
    return () => {
      scrollContainers.forEach(container => container.removeEventListener('scroll', handleScroll));
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);
  
  
  /*
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setListStyles({
        position: "fixed",
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showSuggestions]);
*/
  const handleSuggestionClick = (item) => {
    onChange(item);
    setShowSuggestions(false);
  };

  const suggestionList = (
    <ul style={listStyles} className={AutoCompleteInputStyles.autocompleteList}>
      {filtered.map((item, index) => (
        <li
          key={index}
          className={AutoCompleteInputStyles.autocompleteListItem}
          onMouseDown={() => handleSuggestionClick(item)}
        >
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={AutoCompleteInputStyles.autocompleteWrapper}>
      <input
        ref={inputRef}
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (filtered.length > 0) setShowSuggestions(true);
        }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
      />
      {showSuggestions && filtered.length > 0 &&
        ReactDOM.createPortal(suggestionList, document.body)
      }
    </div>
  );
}

export default AutocompleteInput;
