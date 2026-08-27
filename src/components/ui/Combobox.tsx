"use client";

import { useState, useRef, useEffect, useMemo } from "react";

export interface ComboOption {
  value: string;
  label: string;
  /** Texto secundario mostrado a la derecha (ej. precio) */
  meta?: string;
}

/** Resalta la parte del texto que coincide con la búsqueda */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="rounded-sm bg-antara/20 font-semibold text-antara">
        {text.slice(i, i + query.length)}
      </span>
      {text.slice(i + query.length)}
    </>
  );
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
}: {
  options: ComboOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filtra opciones según lo que escribe el usuario
  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.meta?.toLowerCase().includes(q)
    );
  }, [options, query]);

  // Cierra al hacer clic fuera del componente
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Mantiene la opción activa visible dentro del scroll
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      (listRef.current.children[activeIdx] as HTMLElement)?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIdx]);

  function pick(opt: ComboOption) {
    onChange(opt.value);
    setQuery("");
    setOpen(false);
    setActiveIdx(-1);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setActiveIdx(-1);
    if (!e.target.value) onChange("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && filtered[activeIdx]) pick(filtered[activeIdx]);
        break;
      case "Escape":
      case "Tab":
        setOpen(false);
        setQuery("");
        break;
    }
  }

  // Mientras está abierto muestra lo que escribe; cerrado muestra el label seleccionado
  const displayValue = open ? query : (selected?.label ?? "");

  return (
    <div ref={rootRef} className="relative">
      {/* Campo de entrada */}
      <div
        className={`flex items-center rounded-lg border bg-paper transition-colors ${
          open ? "border-antara ring-2 ring-antara/15" : "border-line"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInput}
          onFocus={() => {
            setQuery("");
            setOpen(true);
            setActiveIdx(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/40"
        />
        {selected ? (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // evita que el input pierda el foco
              clear();
            }}
            title="Limpiar selección"
            className="cursor-pointer pr-3 text-sm text-ink/30 transition-colors hover:text-debt"
          >
            ✕
          </button>
        ) : (
          <span className="select-none pr-3 text-xs text-ink/30" aria-hidden>
            ▾
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-center text-sm text-ink/40">
              {query
                ? `Sin resultados para "${query}"`
                : "Sin opciones disponibles"}
            </p>
          ) : (
            filtered.map((opt, i) => {
              const isActive = i === activeIdx;
              const isSel = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-antara/10 text-antara"
                      : isSel
                      ? "bg-antara/5 font-medium text-antara"
                      : "text-ink hover:bg-paper"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    <HighlightMatch text={opt.label} query={query} />
                  </span>
                  {opt.meta && (
                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        isActive ? "text-antara/70" : "text-ink/40"
                      }`}
                    >
                      {opt.meta}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
