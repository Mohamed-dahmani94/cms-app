import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function DocumentsPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        return <div className="p-8">Veuillez vous connecter.</div>
    }

    // Fetch tasks with PV files
    const tasksWithDocs = await prisma.task.findMany({
        where: {
            pvFileUrl: { not: null }
        },
        include: {
            project: true
        },
        orderBy: {
            updatedAt: 'desc'
        }
    })

    // Group by Project
    const docsByProject = tasksWithDocs.reduce((acc, task) => {
        const projectName = task.project.name
        if (!acc[projectName]) {
            acc[projectName] = []
        }
        acc[projectName].push(task)
        return acc
    }, {} as Record<string, typeof tasksWithDocs>)

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
                        <h1 className="text-3xl font-bold">Gestion des Documents</h1>
                    </div>
                </div>

                {Object.keys(docsByProject).length === 0 ? (
                    <div className="text-center py-10 text-gray-500">Aucun document trouvé.</div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(docsByProject).map(([projectName, tasks]) => (
                            <div key={projectName}>
                                <h2 className="text-xl font-semibold mb-4 flex items-center">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm mr-2">PROJET</span>
                                    {projectName}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {tasks.map((task) => (
                                        <Card key={task.id} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base font-medium truncate" title={task.title}>
                                                    {task.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Mis à jour le:</p>
                                                        <p className="text-sm font-medium">
                                                            {new Date(task.updatedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    {task.pvFileUrl && (
                                                        <Button asChild size="sm" variant="outline">
                                                            <a href={task.pvFileUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="h-4 w-4 mr-2" />
                                                                Télécharger
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
