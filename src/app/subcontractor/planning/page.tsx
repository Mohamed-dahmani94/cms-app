
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SubcontractorPlanningPage() {
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({ min: new Date(), max: new Date() })

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/subcontractor/planning")
            if (res.ok) {
                const data = await res.json()
                const validTasks = data.filter((t: any) => t.startDate && t.dueDate)
                setTasks(validTasks)

                if (validTasks.length > 0) {
                    const dates = validTasks.flatMap((t: any) => [new Date(t.startDate), new Date(t.dueDate)])
                    setDateRange({
                        min: new Date(Math.min(...dates.map((d: Date) => d.getTime()))),
                        max: new Date(Math.max(...dates.map((d: Date) => d.getTime())))
                    })
                }
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const getPosition = (date: string) => {
        const d = new Date(date).getTime()
        const min = dateRange.min.getTime()
        const max = dateRange.max.getTime()
        const total = max - min || 1
        return ((d - min) / total) * 100
    }

    const getDuration = (start: string, end: string) => {
        const s = new Date(start).getTime()
        const e = new Date(end).getTime()
        const min = dateRange.min.getTime()
        const max = dateRange.max.getTime()
        const total = max - min || 1
        return ((e - s) / total) * 100
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "FINAL_DONE": return "bg-green-500"
            case "IN_PROGRESS": return "bg-blue-500"
            default: return "bg-gray-400"
        }
    }

    if (loading) return <div>Chargement du planning...</div>

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Planning des Tâches</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Gantt</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between text-xs text-gray-500 mb-4 border-b pb-2">
                        <span>{dateRange.min.toLocaleDateString()}</span>
                        <span>{dateRange.max.toLocaleDateString()}</span>
                    </div>

                    <div className="space-y-3">
                        {tasks.map(task => {
                            const left = getPosition(task.startDate)
                            const width = getDuration(task.startDate, task.dueDate)

                            return (
                                <div key={task.id} className="flex items-center gap-4 group">
                                    <div className="w-1/4 min-w-[200px] truncate font-medium text-sm">
                                        {task.title}
                                    </div>
                                    <div className="flex-1 relative h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                                        <div
                                            className={`absolute h-full rounded ${getStatusColor(task.status)} opacity-80 group-hover:opacity-100 transition-all`}
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                            title={`${task.title}: ${new Date(task.startDate).toLocaleDateString()} - ${new Date(task.dueDate).toLocaleDateString()}`}
                                        />

                                        {/* Real Progress indicator could overlay here */}
                                        {task.progress > 0 && (
                                            <div
                                                className="absolute h-1 bottom-0 bg-green-400 z-10"
                                                style={{ left: `${left}%`, width: `${width * (task.progress / 100)}%` }}
                                            />
                                        )}
                                    </div>
                                    <div className="text-xs w-12 text-right">
                                        {task.progress}%
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
