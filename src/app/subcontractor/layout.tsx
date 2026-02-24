
"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, CheckSquare, CalendarDays, FileText, Receipt, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SubcontractorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session } = useSession()
    const pathname = usePathname()

    const navItems = [
        { href: "/subcontractor/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/subcontractor/tasks", label: "Tâches", icon: CheckSquare },
        { href: "/subcontractor/planning", label: "Planning", icon: CalendarDays },
        { href: "/subcontractor/billing", label: "Facturation", icon: Receipt },
        { href: "/subcontractor/documents", label: "Documents", icon: FileText },
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Portal Sous-traitant</h1>
                    <p className="text-sm text-gray-500">{session?.user?.name}</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}>
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                        // Handle logout if needed or link to signout
                        window.location.href = "/api/auth/signout"
                    }}>
                        <LogOut className="w-5 h-5 mr-3" />
                        Déconnexion
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
