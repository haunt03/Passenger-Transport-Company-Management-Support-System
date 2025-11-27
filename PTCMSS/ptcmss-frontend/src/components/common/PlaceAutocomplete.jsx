import React from "react";
import { autocompletePlaces } from "../../api/graphhopper";

/**
 * Place Autocomplete Component with dropdown suggestions
 * Supports addresses via GraphHopper Geocoding API (OpenStreetMap data)
 */
export default function PlaceAutocomplete({ value, onChange, placeholder, className, disabled }) {
    const [inputValue, setInputValue] = React.useState(value || "");
    const [suggestions, setSuggestions] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    const justSelectedRef = React.useRef(false);
    const inputRef = React.useRef(null);
    const dropdownRef = React.useRef(null);

    // Sync with parent value
    React.useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    // Fetch suggestions when input changes
    React.useEffect(() => {
        // Skip if user just selected a suggestion
        if (justSelectedRef.current) {
            justSelectedRef.current = false;
            return;
        }

        const timeoutId = setTimeout(async () => {
            if (!inputValue || inputValue.trim().length < 2) {
                setSuggestions([]);
                setShowDropdown(false);
                return;
            }

            setIsLoading(true);
            try {
                const results = await autocompletePlaces(inputValue);
                setSuggestions(results);
                setShowDropdown(results.length > 0);
                setSelectedIndex(-1);
            } catch (error) {
                console.error("Autocomplete error:", error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(timeoutId);
    }, [inputValue]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);
    };

    const handleSelectSuggestion = (suggestion) => {
        // Combine name + full address for maximum clarity
        // Format: "Tên địa điểm, Địa chỉ đầy đủ"
        let displayAddr;

        if (suggestion.fullAddress && suggestion.fullAddress !== suggestion.description) {
            // Combine both: "Name, Full Address"
            displayAddr = `${suggestion.description}, ${suggestion.fullAddress}`;
        } else {
            // Only one is available, use it
            displayAddr = suggestion.description || suggestion.fullAddress;
        }

        // Display the combined address in the input
        setInputValue(displayAddr);
        justSelectedRef.current = true; // Prevent re-fetching after selection
        onChange(displayAddr);
        setShowDropdown(false);
        setSuggestions([]);
    };

    const handleKeyDown = (e) => {
        if (!showDropdown || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === "Enter" && selectedIndex >= 0) {
            e.preventDefault();
            handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        }
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder={placeholder}
                className={className}
                disabled={disabled}
                autoComplete="off"
            />

            {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                </div>
            )}

            {showDropdown && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.placeId || index}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                                index === selectedIndex ? "bg-gray-100" : ""
                            }`}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <div className="flex items-start gap-2">
                                <svg
                                    className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900">
                                        {suggestion.description}
                                    </div>
                                    {suggestion.fullAddress && suggestion.fullAddress !== suggestion.description && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {suggestion.fullAddress}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
