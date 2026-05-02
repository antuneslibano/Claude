"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Combobox from "@/components/combobox"

const VEHICLE_TYPES = [
  { value: "CAR", label: "Carro" },
  { value: "VAN", label: "Van" },
  { value: "TRUCK", label: "Caminhão" },
  { value: "MOTORCYCLE", label: "Moto" },
  { value: "OTHER", label: "Outro" },
]

interface Brand { id: string; name: string }

interface ProductFormProps {
  initialData?: {
    id: string
    brandId: string
    internalCode: string | null
    barcode: string | null
    model: string
    amperage: number
    coldCrankAmps: number | null
    voltage: number
    vehicleType: string
    description: string | null
    costPrice: number
    salePrice: number
    wholesalePrice: number | null
    warrantyMonths: number
    weight: number | null
    active: boolean
  }
}

// Field definido FORA do componente pai para evitar recriação a cada render
// e consequente perda de foco nos inputs
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  className = "",
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        step={type === "number" ? "any" : undefined}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

export default function ProdutoForm({ initialData }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!initialData
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [creatingBrand, setCreatingBrand] = useState(false)

  const [form, setForm] = useState({
    brandId: initialData?.brandId ?? "",
    internalCode: initialData?.internalCode ?? "",
    barcode: initialData?.barcode ?? "",
    model: initialData?.model ?? "",
    amperage: String(initialData?.amperage ?? ""),
    coldCrankAmps: String(initialData?.coldCrankAmps ?? ""),
    voltage: String(initialData?.voltage ?? "12"),
    vehicleType: initialData?.vehicleType ?? "CAR",
    description: initialData?.description ?? "",
    costPrice: String(initialData?.costPrice ?? ""),
    salePrice: String(initialData?.salePrice ?? ""),
    wholesalePrice: String(initialData?.wholesalePrice ?? ""),
    warrantyMonths: String(initialData?.warrantyMonths ?? "12"),
    weight: String(initialData?.weight ?? ""),
    active: initialData?.active ?? true,
  })

  useEffect(() => {
    fetch("/api/marcas").then((r) => r.json()).then(setBrands)
  }, [])

  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function handleCreateBrand(name: string) {
    setCreatingBrand(true)
    try {
      const res = await fetch("/api/marcas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) {
        setBrands((prev) => [...prev, { id: data.id, name: data.name }].sort((a, b) => a.name.localeCompare(b.name)))
        set("brandId", data.id)
      } else {
        setError(data.error ?? "Erro ao criar marca")
      }
    } catch {
      setError("Erro ao criar marca")
    } finally {
      setCreatingBrand(false)
    }
  }

  const margin =
    form.costPrice && form.salePrice
      ? (((parseFloat(form.salePrice) - parseFloat(form.costPrice)) / parseFloat(form.costPrice)) * 100).toFixed(1)
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const url = isEdit ? `/api/produtos/${initialData!.id}` : "/api/produtos"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar produto")
      setLoading(false)
      return
    }

    router.push("/estoque/produtos")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isEdit ? "Editar Produto" : "Novo Produto"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Cadastro de bateria</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Voltar
        </button>
      </div>

      <div className="space-y-6">
        {/* Identificação */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Identificação</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Marca <span className="text-red-500">*</span>
              </label>
              <Combobox
                options={brands.map((b) => ({ value: b.id, label: b.name }))}
                value={form.brandId}
                onChange={(v) => set("brandId", v)}
                placeholder="Selecionar ou criar marca..."
                allowCreate
                onCreateNew={handleCreateBrand}
                disabled={creatingBrand}
              />
              {creatingBrand && (
                <p className="text-xs text-blue-500 mt-1">Criando marca...</p>
              )}
            </div>
            <Field
              label="Modelo"
              name="model"
              value={form.model}
              onChange={(v) => set("model", v)}
              placeholder='ex: "60AH Free"'
              required
              className=""
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo de Veículo <span className="text-red-500">*</span>
              </label>
              <select
                value={form.vehicleType}
                onChange={(e) => set("vehicleType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <Field
              label="Código Interno"
              name="internalCode"
              value={form.internalCode}
              onChange={(v) => set("internalCode", v)}
              placeholder="ex: BAT-001"
            />
            <Field
              label="Código de Barras / QR Code"
              name="barcode"
              value={form.barcode}
              onChange={(v) => set("barcode", v)}
              placeholder="EAN / QR"
            />
          </div>
        </section>

        {/* Especificações técnicas */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Especificações Técnicas</h2>
          <div className="grid grid-cols-4 gap-4">
            <Field
              label="Amperagem (Ah)"
              name="amperage"
              value={form.amperage}
              onChange={(v) => set("amperage", v)}
              type="number"
              placeholder="60"
              required
            />
            <Field
              label="CCA (A frio)"
              name="coldCrankAmps"
              value={form.coldCrankAmps}
              onChange={(v) => set("coldCrankAmps", v)}
              type="number"
              placeholder="Opcional"
            />
            <Field
              label="Voltagem (V)"
              name="voltage"
              value={form.voltage}
              onChange={(v) => set("voltage", v)}
              type="number"
              placeholder="12"
            />
            <Field
              label="Garantia (meses)"
              name="warrantyMonths"
              value={form.warrantyMonths}
              onChange={(v) => set("warrantyMonths", v)}
              type="number"
              placeholder="12"
            />
            <Field
              label="Peso (kg)"
              name="weight"
              value={form.weight}
              onChange={(v) => set("weight", v)}
              type="number"
              placeholder="Opcional"
            />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Descricao / Observacoes</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Informacoes adicionais sobre o produto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Preços */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Precos</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field
              label="Preco de Custo (R$)"
              name="costPrice"
              value={form.costPrice}
              onChange={(v) => set("costPrice", v)}
              type="number"
              placeholder="0,00"
              required
            />
            <div>
              <Field
                label="Preco de Venda (R$)"
                name="salePrice"
                value={form.salePrice}
                onChange={(v) => set("salePrice", v)}
                type="number"
                placeholder="0,00"
                required
              />
              {margin && (
                <p className={`text-xs mt-1 font-medium ${parseFloat(margin) >= 20 ? "text-green-600" : "text-orange-500"}`}>
                  Margem: {margin}%
                </p>
              )}
            </div>
            <Field
              label="Preco Atacado / Oficina (R$)"
              name="wholesalePrice"
              value={form.wholesalePrice}
              onChange={(v) => set("wholesalePrice", v)}
              type="number"
              placeholder="Opcional"
            />
          </div>
        </section>

        {/* Status (apenas na edição) */}
        {isEdit && (
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Produto ativo</p>
                <p className="text-xs text-gray-500">Produtos inativos nao aparecem nas vendas</p>
              </div>
            </label>
          </section>
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-md transition-colors"
        >
          {loading ? "Salvando..." : isEdit ? "Salvar alteracoes" : "Cadastrar produto"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
