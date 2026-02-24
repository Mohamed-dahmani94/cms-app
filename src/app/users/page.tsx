import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function UsersPage() {
    const session = await getServerSession(authOptions)

    if (session?.user.role !== "ADMIN") {
        return <div className="p-8">Accès réservé aux administrateurs.</div>
    }

    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' }
    })

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="icon">
                            <Link href="/">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold">Utilisateurs</h1>
                    </div>
                    <Button asChild>
                        <Link href="/users/create">
                            <Plus className="mr-2 h-4 w-4" /> Nouvel Utilisateur
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user) => (
                        <Card key={user.id}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{user.name}</CardTitle>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 flex-wrap">
                                    <Badge variant="secondary">{user.role}</Badge>
                                    {user.specialty && <Badge variant="outline">{user.specialty}</Badge>}
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <Button asChild variant="outline" size="sm" className="w-full">
                                        <Link href={`/users/${user.id}`}>Modifier</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
