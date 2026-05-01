"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  SELLER: "Vendedor",
  STOCKIST: "Estoquista",
  FINANCIAL: "Financeiro",
}

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: "▦" },
  {
    label: "Estoque",
    icon: "◫",
    children: [
      { label: "Produtos (Baterias)", href: "/estoque/produtos" },
      { label: "Estoque por Loja", href: "/estoque/posicao" },
      { label: "Entrada de Estoque", href: "/estoque/entrada" },
      { label: "Saída de Estoque", href: "/estoque/saida" },
    ],
  },
  {
    label: "Vendas",
    icon: "◈",
    children: [
      { label: "Histórico de Vendas", href: "/vendas" },
      { label: "Nova Venda", href: "/vendas/nova" },
    ],
  },
  { label: "Clientes", href: "/clientes", icon: "◉" },
  { label: "Garantias", href: "/garantias", icon: "◌", disabled: true },
  { label: "Cascos", href: "/cascos", icon: "◎", disabled: true },
  {
    label: "Fornecedores",
    icon: "◧",
    children: [
      { label: "Fornecedores", href: "/fornecedores" },
      { label: "Ordens de Compra", href: "/ordens-compra" },
    ],
  },
  { label: "Financeiro", href: "/financeiro", icon: "◫", disabled: true },
  { label: "Relatórios", href: "/relatorios", icon: "◩", disabled: true },
]

interface SidebarProps {
  userName?: string | null
  companyName?: string
  role?: string
}

export default function Sidebar({ userName, companyName, role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-700">
        <p className="font-bold text-white text-sm">⚡ AutoGest</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{companyName}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map((item) => {
          if (item.children) {
            const isGroupActive = item.children.some((c) => !c.disabled && pathname.startsWith(c.href))
            return (
              <div key={item.label}>
                <div className={`flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide ${isGroupActive ? "text-gray-200" : "text-gray-500"}`}>
                  <span>{item.icon}</span>
                  {item.label}
                </div>
                <div className="pl-4 space-y-0.5">
                  {item.children.map((child) => {
                    const active = pathname === child.href || pathname.startsWith(child.href + "/")
                    if (child.disabled) {
                      return (
                        <div key={child.label} className="flex items-center justify-between px-2 py-1.5 text-xs text-gray-600 cursor-not-allowed">
                          {child.label}
                          <span className="text-[10px] text-gray-600">Em breve</span>
                        </div>
                      )
                    }
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-2 py-1.5 rounded text-xs transition-colors ${
                          active
                            ? "bg-blue-600 text-white font-medium"
                            : "text-gray-300 hover:bg-gray-800"
                        }`}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          if (item.disabled) {
            return (
              <div key={item.label} className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-gray-600 cursor-not-allowed">
                <span className="flex items-center gap-2"><span>{item.icon}</span>{item.label}</span>
                <span className="text-[10px]">Em breve</span>
              </div>
            )
          }

          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 px-4 py-3">
        <p className="text-xs text-gray-300 font-medium truncate">{userName}</p>
        <p className="text-[11px] text-gray-500">{ROLE_LABELS[role ?? ""] ?? role}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
