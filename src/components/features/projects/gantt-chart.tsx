"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface GanttItem {
    id: string
    name: string
    type: "phase" | "task" | "lot" | "article"
    startDate: Date
    endDate: Date
    status: string
    phaseId?: string
    parentId?: string
}

interface GanttChartProps {
    projectId: string
}

export function GanttChart({ projectId }: GanttChartProps) {
    const [items, setItems] = useState<GanttItem[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({ min: new Date(), max: new Date() })
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

    useEffect(() => {
        fetchData()
    }, [projectId])

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const fetchData = async () => {
        try {
            const [phasesRes, tasksRes] = await Promise.all([
                fetch(`/api/projects/${projectId}/phases`),
                fetch(`/api/tasks?projectId=${projectId}`)
            ])

            const phases = await phasesRes.json()
            const tasks = await tasksRes.json()

            // Group tasks by Lot -> Article
            const lotGroups: Record<string, {
                id: string,
                name: string,
                articles: Record<string, {
                    id: string,
                    name: string,
                    tasks: any[]
                }>
            }> = {}

            const standaloneTasks: any[] = []

            tasks.forEach((task: any) => {
                if (!task.startDate || !task.dueDate) return

                const articleTask = task.ArticleTask
                if (articleTask?.article?.lot) {
                    const lotId = articleTask.article.lot.id
                    const articleId = articleTask.article.id

                    if (!lotGroups[lotId]) {
                        lotGroups[lotId] = {
                            id: lotId,
                            name: articleTask.article.lot.name,
                            articles: {}
                        }
                    }

                    if (!lotGroups[lotId].articles[articleId]) {
                        lotGroups[lotId].articles[articleId] = {
                            id: articleId,
                            name: articleTask.article.designation,
                            tasks: []
                        }
                    }

                    lotGroups[lotId].articles[articleId].tasks.push(task)
                } else {
                    standaloneTasks.push(task)
                }
            })

            const allItems: GanttItem[] = []

            // Add Phases
            phases.forEach((p: any) => {
                allItems.push({
                    id: p.id,
                    name: p.name,
                    type: "phase",
                    startDate: new Date(p.startDate),
                    endDate: new Date(p.endDate),
                    status: p.status
                })
            })

            // Add Lots -> Articles -> Tasks
            Object.values(lotGroups).forEach(lot => {
                const lotTasks = Object.values(lot.articles).flatMap(a => a.tasks)
                const lotStart = new Date(Math.min(...lotTasks.map(t => new Date(t.startDate).getTime())))
                const lotEnd = new Date(Math.max(...lotTasks.map(t => new Date(t.dueDate).getTime())))

                allItems.push({
                    id: lot.id,
                    name: lot.name,
                    type: "lot",
                    startDate: lotStart,
                    endDate: lotEnd,
                    status: "IN_PROGRESS" // Derived status could be added
                })

                if (expandedGroups[lot.id]) {
                    Object.values(lot.articles).forEach(article => {
                        const articleTasks = article.tasks
                        const articleStart = new Date(Math.min(...articleTasks.map(t => new Date(t.startDate).getTime())))
                        const articleEnd = new Date(Math.max(...articleTasks.map(t => new Date(t.dueDate).getTime())))

                        allItems.push({
                            id: article.id,
                            name: article.name,
                            type: "article",
                            startDate: articleStart,
                            endDate: articleEnd,
                            status: "IN_PROGRESS",
                            parentId: lot.id
                        })

                        if (expandedGroups[article.id]) {
                            article.tasks.forEach(task => {
                                allItems.push({
                                    id: task.id,
                                    name: task.title,
                                    type: "task",
                                    startDate: new Date(task.startDate),
                                    endDate: new Date(task.dueDate),
                                    status: task.status,
                                    parentId: article.id
                                })
                            })
                        }
                    })
                }
            })

            // Add Standalone Tasks
            standaloneTasks.forEach(task => {
                allItems.push({
                    id: task.id,
                    name: task.title,
                    type: "task",
                    startDate: new Date(task.startDate),
                    endDate: new Date(task.dueDate),
                    status: task.status
                })
            })

            if (allItems.length > 0) {
                const dates = allItems.flatMap(i => [i.startDate, i.endDate])
                setDateRange({
                    min: new Date(Math.min(...dates.map(d => d.getTime()))),
                    max: new Date(Math.max(...dates.map(d => d.getTime())))
                })
            }

            setItems(allItems)
        } catch (error) {
            console.error("Failed to fetch gantt data", error)
        } finally {
            setLoading(false)
        }
    }

    const getPosition = (date: Date) => {
        const total = dateRange.max.getTime() - dateRange.min.getTime()
        const current = date.getTime() - dateRange.min.getTime()
        return (current / total) * 100
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "COMPLETED":
            case "FINAL_DONE":
                return "bg-green-500"
            case "IN_PROGRESS":
            case "PRELIMINARY_DONE":
                return "bg-blue-500"
            case "PENDING":
                return "bg-gray-400"
            default:
                return "bg-gray-300"
        }
    }

    if (loading) return <p>Chargement du planning...</p>
    if (items.length === 0) return <p className="text-gray-500">Aucune donnée de planning disponible.</p>

    return (
        <Card>
            <CardHeader>
                <CardTitle>Planning Gantt</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Timeline Header */}
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>{dateRange.min.toLocaleDateString()}</span>
                        <span>{dateRange.max.toLocaleDateString()}</span>
                    </div>

                    {/* Gantt Rows */}
                    <div className="space-y-2">
                        {items.map((item) => {
                            const left = getPosition(item.startDate)
                            const width = getPosition(item.endDate) - left
                            const isGroup = item.type === "lot" || item.type === "article"
                            const indent = item.type === "article" ? "pl-4" : item.type === "task" && item.parentId ? "pl-8" : ""

                            return (
                                <div key={item.id} className={`flex items-center gap-4 ${indent}`}>
                                    <div className="w-64 flex-shrink-0">
                                        <div
                                            className={`flex items-center gap-2 ${isGroup ? "cursor-pointer font-semibold" : ""}`}
                                            onClick={() => isGroup && toggleGroup(item.id)}
                                        >
                                            <Badge variant={item.type === "phase" ? "default" : item.type === "lot" ? "secondary" : "outline"} className="text-xs">
                                                {item.type === "phase" ? "Phase" : item.type === "lot" ? "Lot" : item.type === "article" ? "Art" : "Tâche"}
                                            </Badge>
                                            <span className="text-sm truncate" title={item.name}>
                                                {item.name}
                                            </span>
                                            {isGroup && (
                                                <span className="text-xs text-gray-400 ml-auto">
                                                    {expandedGroups[item.id] ? "▼" : "▶"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 relative h-8 bg-gray-100 dark:bg-gray-800 rounded">
                                        <div
                                            className={`absolute h-full rounded ${getStatusColor(item.status)} opacity-80 hover:opacity-100 transition-opacity`}
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                minWidth: "2px"
                                            }}
                                            title={`${item.name}: ${item.startDate.toLocaleDateString()} - ${item.endDate.toLocaleDateString()}`}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex gap-4 mt-6 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded" />
                            <span>Terminé</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded" />
                            <span>En cours</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-400 rounded" />
                            <span>En attente</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
