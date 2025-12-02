import React from "react";
import { ChevronDown, X } from "lucide-react";
import provinces from "../../data/provinces.json";

const removeVietnameseTones = (str) => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
};

export default function ProvinceAutocomplete({ value, onChange, error, placeholder }) {
    const [inputValue, setInputValue] = React.useState(value || "");
    const [isOpen, setIsOpen] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const inputRef = React.useRef(null);
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    const filteredProvinces = React.useMemo(() => {
        if (!inputValue.trim()) return provinces;

        const searchTerm = removeVietnameseTones(inputValue.toLowerCase());
        return provinces.filter((province) => {
            const provinceName = removeVietnameseTones(province.toLowerCase());
            return provinceName.includes(searchTerm);
        });
    }, [inputValue]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsOpen(true);
        setHighlightedIndex(-1);

        // Check if exact match exists
        const exactMatch = provinces.find(
            (p) => removeVietnameseTones(p.toLowerCase()) === removeVietnameseTones(newValue.toLowerCase())
        );
        onChange(exactMatch || "");
    };

    const handleSelect = (province) => {
        setInputValue(province);
        onChange(province);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === "ArrowDown" || e.key === "Enter") {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredProvinces.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredProvinces[highlightedIndex]) {
                    handleSelect(filteredProvinces[highlightedIndex]);
                }
                break;
            case "Escape":
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    };

    const handleClear = () => {
        setInputValue("");
        onChange("");
        inputRef.current?.focus();
    };

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getHighlightedText = (text, highlight) => {
        if (!highlight.trim()) return text;

        const searchTerm = removeVietnameseTones(highlight.toLowerCase());
        const textNormalized = removeVietnameseTones(text.toLowerCase());
        const index = textNormalized.indexOf(searchTerm);

        if (index === -1) return text;

        const beforeMatch = text.substring(0, index);
        const match = text.substring(index, index + highlight.length);
        const afterMatch = text.substring(index + highlight.length);

        return (
            <>
                {beforeMatch}
                <span className="font-semibold text-slate-900">{match}</span>
                <span className="text-slate-400">{afterMatch}</span>
            </>
        );
    };

    return (
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder || "Chọn tỉnh/thành phố"}
                    className={`w-full border rounded-lg px-4 py-2.5 pr-20 text-sm transition-all focus:outline-none focus:ring-2 ${
                        error
                            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                            : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                    }`}
                    autoComplete="off"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {inputValue && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                            <X className="h-4 w-4 text-slate-400" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                        <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition-transform ${
                                isOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>
                </div>
            </div>

            {isOpen && filteredProvinces.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {filteredProvinces.map((province, index) => (
                        <button
                            key={province}
                            type="button"
                            onClick={() => handleSelect(province)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                index === highlightedIndex
                                    ? "bg-[#0079BC]/10 text-[#0079BC]"
                                    : "hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                            {getHighlightedText(province, inputValue)}
                        </button>
                    ))}
                </div>
            )}

            {isOpen && filteredProvinces.length === 0 && inputValue && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-sm text-slate-500"
                >
                    Không tìm thấy tỉnh/thành phố phù hợp
                </div>
            )}
        </div>
    );
}
