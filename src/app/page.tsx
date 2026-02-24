import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
  LayoutDashboard,
  CheckSquare,
  Briefcase,
  Users,
  Plus,
  LogOut,
  FileText,
  Settings
} from "lucide-react"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Construction Management System
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {session.user.name} ({session.user.role})
            </span>
            <form action="/api/auth/signout" method="POST">
              <Button type="submit" variant="outline" size="sm">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Projets</CardTitle>
              <CardDescription>Gérer les projets de construction</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/projects">Voir les projets</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tâches</CardTitle>
              <CardDescription>Suivi quotidien des tâches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/tasks">Mes tâches</Link>
              </Button>
              {session.user.role === "ADMIN" && (
                <>
                  <Button asChild variant="secondary" className="w-full">
                    <Link href="/tasks/dashboard">Tableau de bord</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/tasks/create">Créer une tâche</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Finance</CardTitle>
              <CardDescription>Tableau de bord financier</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/finance">Voir finances</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventaire</CardTitle>
              <CardDescription>Gestion des matériaux et équipements</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/inventory">Voir inventaire</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rapports</CardTitle>
              <CardDescription>Rapports quotidiens et analyses</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/reports">Voir rapports</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>Gestion des utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" disabled={session.user.role !== "ADMIN"}>
                <Link href="/users">Gérer utilisateurs</Link>
              </Button>
            </CardContent>
          </Card>

          {session.user.role === "ADMIN" && (
            <Card>
              <CardHeader>
                <CardTitle>Paramètres</CardTitle>
                <CardDescription>Configuration de l'entreprise</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/settings/company">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres entreprise
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
