import { auth } from "@/auth"

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user as any

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500">Bem-vindo, {session?.user?.name}.</p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {[
          { label: "Vendas hoje", value: "—" },
          { label: "Faturamento do mês", value: "—" },
          { label: "Produtos em estoque", value: "—" },
          { label: "Garantias ativas", value: "—" },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-400">Dashboard completo disponível após os demais módulos serem concluídos.</p>
    </div>
  )
}
