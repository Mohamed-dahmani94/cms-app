"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface SubTask {
    id: string
    code: string
    designation: string
    weight: number
    completionPercentage: number
}

interface Task {
    id: string
    code: string
    designation: string
    subTasks: SubTask[]
}

interface Lot {
    code: string
    name: string
}

interface Article {
    id: string
    code: string
    designation: string
    lot: Lot
    tasks: Task[]
}

interface ProgressRecord {
    id: string
    floorNumber: number | null
    completionPercentage: number
    completedAmount: number
    pvRequired: boolean
    pvUploaded: boolean
    article: Article
}

interface Block {
    id: string
    name: string
}

interface BlockProgressTrackerProps {
    projectId: string
}

export function BlockProgressTracker({ projectId }: BlockProgressTrackerProps) {
    const [blocks, setBlocks] = useState<Block[]>([])
    const [selectedBlock, setSelectedBlock] = useState<string>("")
    const [progress, setProgress] = useState<ProgressRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [editingSubTask, setEditingSubTask] = useState<string | null>(null)
    const [tempPercentage, setTempPercentage] = useState<number>(0)
    const [currency, setCurrency] = useState<"EUR" | "DZD">("DZD")

    const fetchBlocks = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`)
            if (res.ok) {
                const project = await res.json()
                setBlocks(project.blocks || [])
                setCurrency((project.currencyUnit as "EUR" | "DZD") || "DZD")
                if (project.blocks?.length > 0) {
                    setSelectedBlock(project.blocks[0].id)
                }
            }
        } catch (error) {
            console.error("Failed to fetch blocks:", error)
        }
    }, [projectId])

    useEffect(() => {
        fetchBlocks()
    }, [fetchBlocks])

    const fetchProgress = useCallback(async (blockId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/blocks/${blockId}/progress`)
            if (res.ok) {
                const data = await res.json()
                setProgress(data.progress || [])
            }
        } catch (error) {
            console.error("Failed to fetch progress:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedBlock) {
            fetchProgress(selectedBlock)
        }
    }, [selectedBlock, fetchProgress])

    const handleUpdateSubTask = async (
        articleId: string,
        floorNumber: number | null,
        subTaskId: string,
        percentage: number
    ) => {
        try {
            const res = await fetch(`/api/blocks/${selectedBlock}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleId,
                    floorNumber,
                    subTaskProgress: [{ subTaskId, percentage }]
                })
            })

            if (res.ok) {
                // Refresh progress
                fetchProgress(selectedBlock)
                setEditingSubTask(null)
            }
        } catch (error) {
            console.error("Failed to update progress:", error)
        }
    }

    const groupedProgress = progress.reduce((acc, p) => {
        const key = p.floorNumber !== null ? `Étage ${p.floorNumber}` : 'Sans étage'
        if (!acc[key]) acc[key] = []
        acc[key].push(p)
        return acc
    }, {} as Record<string, ProgressRecord[]>)

    return (
        <div className="space-y-4">
            {/* Block Selector */}
            <Card>
                <CardHeader>
                    <CardTitle>Suivi d&apos;Avancement par Bloc</CardTitle>
                    <CardDescription>Mise à jour du pourcentage de complétion des sous-tâches</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un bloc" />
                        </SelectTrigger>
                        <SelectContent>
                            {blocks.map((block) => (
                                <SelectItem key={block.id} value={block.id}>
                                    {block.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {loading && <div className="text-center p-4">Chargement...</div>}

            {/* Progress by Floor */}
            {!loading && Object.entries(groupedProgress).map(([floor, records]) => (
                <Card key={floor}>
                    <CardHeader>
                        <CardTitle className="text-lg">{floor}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {records.map((record) => (
                            <div key={record.id} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{record.article.code} - {record.article.designation}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {record.article.lot.code} - {record.article.lot.name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">{record.completionPercentage.toFixed(1)}%</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatCurrency(record.completedAmount, currency)}
                                        </p>
                                    </div>
                                </div>

                                <Progress value={record.completionPercentage} className="h-2" />

                                {record.pvRequired && (
                                    <div className="flex items-center gap-2">
                                        {record.pvUploaded ? (
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                PV Uploadé
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                PV Requis
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {/* Tasks and SubTasks */}
                                <div className="space-y-2">
                                    {record.article.tasks?.map((task) => (
                                        <div key={task.id} className="ml-4 space-y-1">
                                            <p className="text-sm font-medium">{task.code} - {task.designation}</p>
                                            {task.subTasks?.map((subTask) => (
                                                <div key={subTask.id} className="ml-4 flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground w-32">
                                                        {subTask.code}: {subTask.designation}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        Poids: {subTask.weight}%
                                                    </Badge>

                                                    {editingSubTask === subTask.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={tempPercentage}
                                                                onChange={(e) => setTempPercentage(parseInt(e.target.value) || 0)}
                                                                className="w-20 h-8"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleUpdateSubTask(
                                                                    record.article.id,
                                                                    record.floorNumber,
                                                                    subTask.id,
                                                                    tempPercentage
                                                                )}
                                                            >
                                                                OK
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setEditingSubTask(null)}
                                                            >
                                                                ✕
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setEditingSubTask(subTask.id)
                                                                setTempPercentage(subTask.completionPercentage)
                                                            }}
                                                        >
                                                            {subTask.completionPercentage}%
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

