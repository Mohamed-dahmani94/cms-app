import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { formatCompactCurrency } from "@/lib/currency"

export default async function ProjectsPage() {
    const session = await getServerSession(authOptions)

    const projects = await prisma.project.findMany({
        include: {
            market: {
                include: {
                    lots: {
                        include: {
                            articles: {
                                include: {
                                    tasks: {
                                        include: {
                                            subTasks: {
                                                select: {
                                                    id: true,
                                                    completionPercentage: true,
                                                    weight: true,
                                                    isReserve: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    // Calculate market-based stats for each project
    const projectsWithProgress = projects.map(project => {
        let totalMarketAmount = 0
        let totalProductionCost = 0

        if (project.market) {
            project.market.lots.forEach(lot => {
                lot.articles.forEach(article => {
                    totalMarketAmount += article.totalAmount

                    // Calculate Article Progress from Tasks/SubTasks
                    let articleProgress = 0

                    if (article.tasks.length > 0) {
                        const totalArticleDuration = article.tasks.reduce((sum, t) => sum + t.duration, 0)

                        if (totalArticleDuration > 0) {
                            const weightedTaskProgressSum = article.tasks.reduce((sum, t) => {
                                let taskCompletion = 0
                                const subTasks = (t.subTasks || []).filter(st => !st.isReserve)

                                if (subTasks.length > 0) {
                                    const totalWeight = subTasks.reduce((s, st) => s + (st.weight || 0), 0)
                                    const totalWeightedScore = subTasks.reduce((s, st) => s + ((st.completionPercentage || 0) * (st.weight || 0)), 0)

                                    if (totalWeight > 0) {
                                        taskCompletion = totalWeightedScore / totalWeight
                                    } else {
                                        const rawSum = subTasks.reduce((s, st) => s + (st.completionPercentage || 0), 0)
                                        taskCompletion = rawSum / subTasks.length
                                    }
                                }

                                return sum + (t.duration * taskCompletion)
                            }, 0)

                            articleProgress = weightedTaskProgressSum / totalArticleDuration
                        }
                    }

                    const earnedValue = article.totalAmount * (articleProgress / 100)
                    totalProductionCost += earnedValue
                })
            })
        }

        const globalProgress = totalMarketAmount > 0 ? (totalProductionCost / totalMarketAmount) * 100 : 0

        return {
            ...project,
            productionCost: totalProductionCost,
            totalMarketAmount,
            progressPercentage: globalProgress
        }
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
                        <h1 className="text-3xl font-bold">Projets</h1>
                    </div>
                    {session?.user.role === "ADMIN" && (
                        <Button asChild>
                            <Link href="/projects/create">
                                <Plus className="mr-2 h-4 w-4" /> Nouveau Projet
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectsWithProgress.map((project) => (
                        <Card key={project.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{project.name}</CardTitle>
                                    <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                                        {project.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-500">{project.description || "Aucune description"}</p>

                                {/* Production Progress */}
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">Avancement Production</span>
                                        <span className="text-green-700 font-bold">{project.progressPercentage.toFixed(2)}%</span>
                                    </div>
                                    <Progress value={project.progressPercentage} className="h-2" />
                                </div>

                                {/* Financial KPIs */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded">
                                        <p className="text-green-700 dark:text-green-400 font-semibold uppercase text-[10px]">Production</p>
                                        <p className="font-bold text-green-800 dark:text-green-300">
                                            {formatCompactCurrency(project.productionCost, "DZD")}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                        <p className="text-gray-700 dark:text-gray-400 font-semibold uppercase text-[10px]">Marché Total</p>
                                        <p className="font-bold text-gray-800 dark:text-gray-300">
                                            {formatCompactCurrency(project.totalMarketAmount, "DZD")}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-between text-xs text-gray-400 pt-2 border-t">
                                    <span>{project.location || "N/A"}</span>
                                    <span>{project.client || "N/A"}</span>
                                </div>

                                <Button asChild variant="outline" size="sm" className="w-full">
                                    <Link href={`/projects/${project.id}`}>
                                        {session?.user.role === "ADMIN" ? "Gérer" : "Voir détails"}
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {projects.length === 0 && (
                        <p className="text-gray-500 col-span-full text-center py-10">Aucun projet trouvé.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
