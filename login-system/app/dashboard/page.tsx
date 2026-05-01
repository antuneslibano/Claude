import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-1">Logado como</p>
        <h1 className="text-2xl font-semibold text-gray-900">
          Bem-vindo, {session.user?.name}!
        </h1>
        <p className="text-sm text-gray-400 mt-1">{session.user?.email}</p>
      </div>

      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}
      >
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Sair
        </button>
      </form>
    </div>
  )
}
