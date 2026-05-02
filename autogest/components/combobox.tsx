"use client"

import { useEffect, useRef, useState } from "react"

interface ComboboxProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowCreate?: boolean
  onCreateNew?: (name: string) => void
  className?: string
  disabled?: boolean
}

export default function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecionar...",
  allowCreate = false,
  onCreateNew,
  className = "",
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Exibe o label da opção selecionada quando fechado e sem query
  const selectedLabel = options.find((o) => o.value === value)?.label ?? ""

  // Quando abre, preenche o input com o label atual para facilitar filtragem
  function handleOpen() {
    if (disabled) return
    setQuery(selectedLabel)
    setOpen(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function handleSelect(optValue: string) {
    onChange(optValue)
    setOpen(false)
    setQuery("")
  }

  function handleCreateNew() {
    if (onCreateNew && query.trim()) {
      onCreateNew(query.trim())
      setOpen(false)
      setQuery("")
    }
  }

  // Fecha ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )

  const showCreate =
    allowCreate &&
    query.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())

  const displayValue = open ? query : selectedLabel

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleOpen}
        onClick={handleOpen}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={!open}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "bg-white cursor-pointer"
        } ${open ? "cursor-text" : ""}`}
      />
      {/* Chevron */}
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
        {open ? "▲" : "▼"}
      </span>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-xs text-gray-400">Nenhuma opção encontrada</div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(opt.value)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                opt.value === value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleCreateNew()
              }}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1.5 border-t border-gray-100"
            >
              <span className="text-base leading-none">+</span>
              <span>Criar: <strong>{query.trim()}</strong></span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
