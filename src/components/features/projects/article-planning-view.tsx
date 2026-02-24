"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Calendar, Clock } from "lucide-react"

interface ArticlePlanningViewProps {
    projectId: string
}

export function ArticlePlanningView({ projectId }: ArticlePlanningViewProps) {
    const [market, setMarket] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

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

    const toggleArticle = (id: string) => {
        setExpandedArticles(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleTask = (id: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const formatDate = (date: string | null) => {
        if (!date) return "Non définie"
        return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    if (loading) return <p className="text-center py-8">Chargement du planning...</p>
    if (!market) return <p className="text-center py-8 text-gray-500">Aucun marché configuré pour ce projet.</p>

    const odsDate = market.odsDate

    return (
        <div className="space-y-4">
            {/* ODS Date Header */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200">
                <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                        <Calendar className="h-8 w-8 text-blue-600" />
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Date de Démarrage (ODS)</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatDate(odsDate)}</p>
                        </div>
                        <div className="ml-auto text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-400">N° Marché</p>
                            <p className="text-lg font-semibold">{market.marketNumber || "N/A"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Articles List */}
            {market.lots?.map((lot: any) => (
                <Card key={lot.id}>
                    <CardHeader className="py-3 bg-gray-100 dark:bg-gray-800">
                        <CardTitle className="text-base">
                            <Badge variant="secondary" className="mr-2">{lot.code}</Badge>
                            {lot.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {lot.articles?.map((article: any) => {
                            const isExpanded = expandedArticles.has(article.id)
                            const taskCount = article.tasks?.length || 0
                            const completedTasks = article.tasks?.filter((t: any) =>
                                t.subTasks?.every((st: any) => st.status === 'DONE')
                            ).length || 0
                            const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0

                            return (
                                <div key={article.id} className="border-b last:border-b-0">
                                    {/* Article Row */}
                                    <div
                                        className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                        onClick={() => toggleArticle(article.id)}
                                    >
                                        <Button variant="ghost" size="sm" className="p-0 h-6 w-6 mr-2">
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </Button>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{article.code}</Badge>
                                                <span className="font-medium">{article.designation}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {taskCount} tâche{taskCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-32">
                                                <Progress value={progress} className="h-2" />
                                                <p className="text-xs text-center mt-1">{progress}%</p>
                                            </div>
                                            {article.pvRequired && (
                                                <Badge variant="destructive" className="text-xs">PV Requis</Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Tasks */}
                                    {isExpanded && article.tasks?.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-gray-900 border-t">
                                            {article.tasks.map((task: any) => {
                                                const isTaskExpanded = expandedTasks.has(task.id)
                                                const subtaskCount = task.subTasks?.length || 0
                                                const completedSubtasks = task.subTasks?.filter((st: any) => st.status === 'DONE').length || 0
                                                const taskProgress = subtaskCount > 0 ? Math.round((completedSubtasks / subtaskCount) * 100) : 0

                                                return (
                                                    <div key={task.id} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700">
                                                        {/* Task Row */}
                                                        <div
                                                            className="flex items-center p-3 pl-10 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                                            onClick={() => toggleTask(task.id)}
                                                        >
                                                            <Button variant="ghost" size="sm" className="p-0 h-5 w-5 mr-2">
                                                                {isTaskExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                            </Button>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-xs">{task.code}</Badge>
                                                                    <span className="text-sm">{task.designation}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                                    <span>Durée: {task.duration || 0} jours</span>
                                                                    <span>{subtaskCount} sous-tâche{subtaskCount !== 1 ? 's' : ''}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-24">
                                                                    <Progress value={taskProgress} className="h-1.5" />
                                                                    <p className="text-xs text-center">{taskProgress}%</p>
                                                                </div>
                                                                <Badge variant={task.priority === 'HIGH' ? 'destructive' : 'outline'} className="text-xs">
                                                                    {task.priority || 'MEDIUM'}
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        {/* Expanded Subtasks */}
                                                        {isTaskExpanded && task.subTasks?.length > 0 && (
                                                            <div className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
                                                                {task.subTasks.map((subtask: any) => (
                                                                    <div key={subtask.id} className="flex items-center p-2 pl-16 text-sm border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                                                                        <div className="flex-1 flex items-center gap-2">
                                                                            <span className="text-gray-400">↳</span>
                                                                            <Badge variant="outline" className="text-xs">{subtask.code}</Badge>
                                                                            <span className="text-sm">{subtask.designation}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-gray-500">{subtask.duration || 0}j</span>
                                                                            <Badge
                                                                                variant={subtask.status === 'DONE' ? 'default' : 'outline'}
                                                                                className={`text-xs ${subtask.status === 'DONE' ? 'bg-green-500' : ''}`}
                                                                            >
                                                                                {subtask.status || 'PENDING'}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {isExpanded && (!article.tasks || article.tasks.length === 0) && (
                                        <div className="p-4 pl-10 text-sm text-gray-500 bg-gray-50 dark:bg-gray-900">
                                            Aucune tâche définie pour cet article.
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            ))}

            {(!market.lots || market.lots.length === 0) && (
                <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                        Aucun lot ou article importé. Utilisez l'import Excel dans l'onglet Marché.
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
