export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/estoque/:path*", "/vendas/:path*", "/clientes/:path*", "/financeiro/:path*", "/relatorios/:path*", "/configuracoes/:path*"],
}
