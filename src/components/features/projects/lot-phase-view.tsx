"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Layers, FileText, CheckSquare } from "lucide-react"

interface LotPhaseViewProps {
    projectId: string
}

export function LotPhaseView({ projectId }: LotPhaseViewProps) {
    const [market, setMarket] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set())
    const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchData()
    }, [projectId])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/market`)
            if (res.ok) {
                const data = await res.json()
                setMarket(data.market)
            }
        } catch (error) {
            console.error("Failed to fetch market data:", error)
        } finally {
            setLoading(false)
        }
    }

    const toggleLot = (id: string) => {
        setExpandedLots(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleArticle = (id: string) => {
        setExpandedArticles(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    if (loading) return <p className="text-center py-8">Chargement...</p>
    if (!market) return <p className="text-center py-8 text-gray-500">Aucun marché configuré.</p>

    return (
        <div className="space-y-3">
            {market.lots?.map((lot: any) => {
                const isLotExpanded = expandedLots.has(lot.id)
                const articleCount = lot.articles?.length || 0
                const totalTasks = lot.articles?.reduce((sum: number, a: any) => sum + (a.tasks?.length || 0), 0) || 0

                return (
                    <Card key={lot.id} className="overflow-hidden">
                        {/* LOT Header */}
                        <div
                            className="flex items-center p-4 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 cursor-pointer hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-colors"
                            onClick={() => toggleLot(lot.id)}
                        >
                            <Button variant="ghost" size="sm" className="p-0 h-8 w-8 mr-3">
                                {isLotExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </Button>
                            <Layers className="h-5 w-5 mr-3 text-blue-600" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-600">{lot.code}</Badge>
                                    <span className="font-semibold text-lg">{lot.name}</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {articleCount} article{articleCount !== 1 ? 's' : ''} • {totalTasks} tâche{totalTasks !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {/* Articles inside Lot */}
                        {isLotExpanded && (
                            <CardContent className="p-0 border-t">
                                {lot.articles?.length > 0 ? (
                                    lot.articles.map((article: any) => {
                                        const isArticleExpanded = expandedArticles.has(article.id)
                                        const taskCount = article.tasks?.length || 0

                                        return (
                                            <div key={article.id} className="border-b last:border-b-0">
                                                {/* Article Row */}
                                                <div
                                                    className="flex items-center p-3 pl-12 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                                                    onClick={() => toggleArticle(article.id)}
                                                >
                                                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6 mr-2">
                                                        {isArticleExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </Button>
                                                    <FileText className="h-4 w-4 mr-2 text-green-600" />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-xs">{article.code}</Badge>
                                                            <span className="font-medium">{article.designation}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                            <span>{taskCount} tâche{taskCount !== 1 ? 's' : ''}</span>
                                                            <span>•</span>
                                                            <span>{article.unit}</span>
                                                            <span>•</span>
                                                            <span>Qté: {article.quantity}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {article.pvRequired && (
                                                            <Badge variant="destructive" className="text-xs">PV</Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tasks inside Article */}
                                                {isArticleExpanded && (
                                                    <div className="bg-gray-50 dark:bg-gray-900 border-t">
                                                        {article.tasks?.length > 0 ? (
                                                            article.tasks.map((task: any) => {
                                                                const subtaskCount = task.subTasks?.length || 0
                                                                const completedSubtasks = task.subTasks?.filter((st: any) => st.status === 'DONE').length || 0
                                                                const taskProgress = subtaskCount > 0 ? Math.round((completedSubtasks / subtaskCount) * 100) : 0

                                                                return (
                                                                    <div key={task.id} className="flex items-center p-2 pl-20 border-b last:border-b-0 border-gray-200 dark:border-gray-800">
                                                                        <CheckSquare className="h-4 w-4 mr-2 text-orange-500" />
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <Badge variant="secondary" className="text-xs">{task.code}</Badge>
                                                                                <span className="text-sm">{task.designation}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                                                <span>{task.duration || 0} jours</span>
                                                                                <span>•</span>
                                                                                <span>{subtaskCount} sous-tâche{subtaskCount !== 1 ? 's' : ''}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-20">
                                                                                <Progress value={taskProgress} className="h-1.5" />
                                                                                <p className="text-xs text-center text-gray-500">{taskProgress}%</p>
                                                                            </div>
                                                                            <Badge
                                                                                variant={task.priority === 'HIGH' ? 'destructive' : 'outline'}
                                                                                className="text-xs"
                                                                            >
                                                                                {task.priority || 'MEDIUM'}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })
                                                        ) : (
                                                            <p className="p-3 pl-20 text-sm text-gray-500">Aucune tâche définie.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="p-4 pl-12 text-sm text-gray-500">Aucun article dans ce lot.</p>
                                )}
                            </CardContent>
                        )}
                    </Card>
                )
            })}

            {(!market.lots || market.lots.length === 0) && (
                <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                        Aucun lot importé. Utilisez l'import Excel dans l'onglet Marché.
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
