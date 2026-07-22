import { useState, useRef, useEffect } from "react";

type Option = { value: string; label: string; sublabel?: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
};

export default function SearchableSelect({ options, value, onChange, placeholder = "Buscar...", className = "", compact = false }: Props) {
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync label when value changes externally
  useEffect(() => {
    setQuery(options.find((o) => o.value === value)?.label ?? "");
  }, [value, options]);

  const filtered = query && !selected
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel ?? "").includes(query)
      )
    : options;

  function select(o: Option) {
    onChange(o.value);
    setQuery(o.label);
    setOpen(false);
  }

  function handleBlur(e: React.FocusEvent) {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    // Si no seleccionó nada, restaurar label del valor actual
    setQuery(options.find((o) => o.value === value)?.label ?? "");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} onBlur={handleBlur}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(""); // limpiar selección al tipear
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={`w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-20 max-h-48 overflow-y-auto shadow-xl">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(o); }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors hover:bg-gray-700 ${o.value === value ? "bg-gray-700" : ""}`}
            >
              <span className="text-white">{o.label}</span>
              {o.sublabel && <span className="text-gray-500 text-xs shrink-0">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
