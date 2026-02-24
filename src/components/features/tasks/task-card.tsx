"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Lock, AlertCircle, Camera, Navigation, UserCog, FileText, Edit } from "lucide-react"

interface TaskCardProps {
    task: {
        id: string
        title: string
        description?: string
        status: string
        priority: string
        isLocked: boolean
        isFuzzy: boolean
        pvFileUrl?: string
    }
    isAdmin?: boolean
    onComplete: (id: string) => void
    onUploadPV: (id: string) => void
    onTransfer: (id: string) => void
    onLocate: (id: string) => void
    onEdit?: (id: string, data: { title: string; description: string }) => void
}

export function TaskCard({ task, isAdmin, onComplete, onUploadPV, onTransfer, onLocate, onEdit }: TaskCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "FINAL_DONE": return "bg-green-500"
            case "PRELIMINARY_DONE": return "bg-blue-500"
            case "IN_PROGRESS": return "bg-yellow-500"
            case "LOCKED": return "bg-gray-500"
            default: return "bg-slate-500"
        }
    }

    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(task.title)
    const [editDescription, setEditDescription] = useState(task.description || "")

    const handleSave = () => {
        onEdit?.(task.id, { title: editTitle, description: editDescription })
        setIsEditing(false)
    }

    return (
        <Card className={`w-full mb-4 ${task.isLocked ? 'opacity-75 bg-gray-50 dark:bg-gray-900' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                {isEditing ? (
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="font-bold text-lg" />
                ) : (
                    <CardTitle className="text-lg font-bold">
                        {task.title}
                    </CardTitle>
                )}
                <Badge className={getStatusColor(task.status)}>
                    {task.status.replace("_", " ")}
                </Badge>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mb-4" />
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {task.description || "No description provided."}
                    </p>
                )}

                {task.pvFileUrl && (
                    <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Document (PV):</p>
                        <a href={task.pvFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline text-blue-500 hover:text-blue-700 flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            Voir le document
                        </a>
                    </div>
                )}

                <div className="flex gap-2 mb-2">
                    {task.isLocked && (
                        <Badge variant="outline" className="text-red-500 border-red-200">
                            <Lock className="w-3 h-3 mr-1" /> Locked
                        </Badge>
                    )}
                    {task.isFuzzy && (
                        <Badge variant="outline" className="text-orange-500 border-orange-200">
                            <AlertCircle className="w-3 h-3 mr-1" /> Fuzzy
                        </Badge>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                {isAdmin && (
                    <div className="flex gap-2 w-full mb-2">
                        {isEditing ? (
                            <>
                                <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
                            </>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="w-full">
                                <Edit className="w-4 h-4 mr-2" /> Modifier
                            </Button>
                        )}
                    </div>
                )}

                {!task.isLocked && task.status !== "FINAL_DONE" && (
                    <>
                        <div className="grid grid-cols-2 gap-2 w-full">
                            {task.status !== "PRELIMINARY_DONE" ? (
                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={() => onComplete(task.id)}
                                    variant="default"
                                >
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                    Done (Prelim)
                                </Button>
                            ) : (
                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={() => onUploadPV(task.id)}
                                    variant="secondary"
                                >
                                    <Camera className="mr-2 h-5 w-5" />
                                    Upload PV
                                </Button>
                            )}

                            <Button variant="outline" className="w-full h-12" onClick={() => onLocate(task.id)}>
                                <Navigation className="mr-2 h-5 w-5" />
                                Locate
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => onTransfer(task.id)}
                        >
                            <UserCog className="mr-2 h-4 w-4" />
                            Transfer Task
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    )
}
