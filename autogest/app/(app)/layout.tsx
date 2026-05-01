import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as any

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        userName={user?.name}
        companyName={user?.companyName}
        role={user?.role}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
