"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Store { id: string; name: string }
interface Product { id: string; brandName: string; model: string; amperage: number; salePrice: number; wholesalePrice: number | null; available: number }
interface Customer { id: string; name: string; phone: string | null; type: string }
interface CartItem {
  productId: string
  brandName: string
  model: string
  amperage: number
  unitPrice: number
  discount: number
  available: number
}

const METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "DEBIT_CARD", label: "Débito" },
  { value: "CREDIT_CARD", label: "Crédito" },
  { value: "INSTALLMENT_CARD", label: "Crédito Parc." },
  { value: "BANK_SLIP", label: "Boleto" },
  { value: "STORE_CREDIT", label: "Crediário" },
]

export default function NovaVendaPage() {
  const router = useRouter()

  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  const [storeId, setStoreId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [notes, setNotes] = useState("")
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([{ method: "PIX", amount: 0 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/lojas").then((r) => r.json()).then((data: Store[]) => {
      setStores(data)
      if (data.length > 0) setStoreId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!storeId) return
    fetch(`/api/estoque/posicao?storeId=${storeId}`).then((r) => r.json()).then((data: any[]) => {
      setProducts(
        data
          .filter((p) => p.available > 0)
          .map((p) => ({
            id: p.id,
            brandName: p.brand,
            model: p.model,
            amperage: p.amperage,
            salePrice: p.salePrice,
            wholesalePrice: p.wholesalePrice ?? null,
            available: p.available,
          }))
      )
    })
  }, [storeId])

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return }
    const t = setTimeout(() => {
      fetch(`/api/clientes?search=${encodeURIComponent(customerSearch)}&limit=10`)
        .then((r) => r.json())
        .then((data) => setCustomers(data.customers ?? []))
    }, 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  // Ajustar pagamento único automaticamente
  useEffect(() => {
    if (payments.length === 1) {
      const t = subtotal - globalDiscount
      setPayments([{ ...payments[0], amount: parseFloat(t.toFixed(2)) }])
    }
  }, [cart, globalDiscount])

  const subtotal = cart.reduce((acc, i) => acc + (i.unitPrice - i.discount), 0)
  const total = subtotal - globalDiscount
  const paymentsTotal = payments.reduce((a, p) => a + (p.amount || 0), 0)
  const paymentDiff = parseFloat((total - paymentsTotal).toFixed(2))

  const filteredProducts = productSearch.trim()
    ? products.filter((p) =>
        `${p.brandName} ${p.model} ${p.amperage}`.toLowerCase().includes(productSearch.toLowerCase())
      )
    : products

  function addToCart(product: Product) {
    if (cart.find((i) => i.productId === product.id)) return
    setCart((prev) => [
      ...prev,
      {
        productId: product.id,
        brandName: product.brandName,
        model: product.model,
        amperage: product.amperage,
        unitPrice: product.salePrice,
        discount: 0,
        available: product.available,
      },
    ])
    setProductSearch("")
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  function updateCartItem(productId: string, field: "unitPrice" | "discount", value: number) {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, [field]: value } : i)))
  }

  function addPayment() {
    setPayments((prev) => [...prev, { method: "CASH", amount: 0 }])
  }

  function removePayment(i: number) {
    setPayments((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updatePayment(i: number, field: "method" | "amount", value: string | number) {
    setPayments((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!storeId) { setError("Selecione uma loja."); return }
    if (cart.length === 0) { setError("Adicione ao menos um produto."); return }
    if (payments.length === 0) { setError("Adicione ao menos uma forma de pagamento."); return }
    if (Math.abs(paymentDiff) > 0.01) { setError(`Diferença de R$ ${Math.abs(paymentDiff).toFixed(2)} no pagamento.`); return }

    setLoading(true)
    const res = await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        customerId: customerId || undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: 1,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
        discount: globalDiscount,
        payments,
        notes: notes || undefined,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      router.push(`/vendas/${data.id}`)
    } else {
      setError(data.error ?? "Erro ao registrar venda")
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nova Venda</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registrar venda de bateria(s)</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6">
          {/* Coluna esquerda: loja + cliente + produtos */}
          <div className="col-span-2 space-y-5">
            {/* Loja */}
            {stores.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Loja</label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Cliente */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Cliente <span className="font-normal text-gray-400">(opcional)</span></p>
              {customerId ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2">
                  <span className="text-sm text-blue-800 font-medium">
                    {customers.find((c) => c.id === customerId)?.name ?? "Cliente selecionado"}
                  </span>
                  <button type="button" onClick={() => { setCustomerId(""); setCustomerSearch("") }} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar cliente por nome ou telefone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {customers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name); setCustomers([]) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.phone && <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Busca de produto */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Adicionar produto ao carrinho</p>
              <input
                type="text"
                placeholder="Buscar por marca, modelo ou amperagem..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              {productSearch && (
                <div className="border border-gray-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3 py-2">Nenhum produto encontrado com estoque disponível.</p>
                  ) : (
                    filteredProducts.map((p) => {
                      const inCart = !!cart.find((i) => i.productId === p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={inCart}
                          onClick={() => addToCart(p)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between border-b border-gray-100 last:border-0 ${inCart ? "opacity-40 cursor-not-allowed bg-gray-50" : "hover:bg-blue-50"}`}
                        >
                          <span>
                            <span className="font-medium">{p.brandName} {p.model}</span>
                            <span className="text-gray-400 ml-1 text-xs">({p.amperage}Ah)</span>
                          </span>
                          <span className="flex items-center gap-3 text-xs">
                            <span className="text-gray-400">{p.available} un.</span>
                            <span className="font-semibold text-green-700">R$ {p.salePrice.toFixed(2)}</span>
                            {inCart && <span className="text-blue-500">No carrinho</span>}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Carrinho */}
            {cart.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700">Carrinho ({cart.length} item{cart.length > 1 ? "s" : ""})</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-100">
                      <th className="px-4 py-2 text-xs text-gray-500 font-medium">Produto</th>
                      <th className="px-4 py-2 text-xs text-gray-500 font-medium">Preço unit.</th>
                      <th className="px-4 py-2 text-xs text-gray-500 font-medium">Desconto</th>
                      <th className="px-4 py-2 text-xs text-gray-500 font-medium">Total</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cart.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.brandName} {item.model}</p>
                          <p className="text-xs text-gray-400">{item.amperage}Ah · {item.available} disponíveis</p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateCartItem(item.productId, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discount}
                            onChange={(e) => updateCartItem(item.productId, "discount", parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          R$ {(item.unitPrice - item.discount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Coluna direita: totais + pagamento */}
          <div className="space-y-5">
            {/* Resumo financeiro */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2">Resumo</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Desconto geral</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
                <span>Total</span>
                <span className="text-lg">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Pagamento */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2">Pagamento</p>
              {payments.map((p, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex gap-2">
                    <select
                      value={p.method}
                      onChange={(e) => updatePayment(i, "method", e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    {payments.length > 1 && (
                      <button type="button" onClick={() => removePayment(i)} className="text-xs text-red-500 px-1">✕</button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={p.amount}
                    onChange={(e) => updatePayment(i, "amount", parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Valor"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addPayment}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Dividir pagamento
              </button>
              {paymentDiff !== 0 && (
                <p className={`text-xs ${paymentDiff > 0 ? "text-amber-600" : "text-red-600"}`}>
                  {paymentDiff > 0 ? `Faltam R$ ${paymentDiff.toFixed(2)}` : `Excesso de R$ ${Math.abs(paymentDiff).toFixed(2)}`}
                </p>
              )}
            </div>

            {/* Observações */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading || cart.length === 0 || Math.abs(paymentDiff) > 0.01}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? "Registrando..." : `Confirmar Venda · R$ ${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
