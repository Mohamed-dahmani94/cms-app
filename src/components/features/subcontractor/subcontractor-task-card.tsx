
"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Play, Camera, FileText, CheckCircle2, Upload } from "lucide-react"

interface SubcontractorTaskCardProps {
    task: any
    onLaunch: (id: string) => void
    onUpdateProgress: (id: string, progress: number) => void
    onUploadPV: (id: string) => void
    onUploadPhoto: (id: string) => void
}

export function SubcontractorTaskCard({ task, onLaunch, onUpdateProgress, onUploadPV, onUploadPhoto }: SubcontractorTaskCardProps) {
    const [progress, setProgress] = useState(task.progress || 0)
    const [isUpdating, setIsUpdating] = useState(false)

    const handleProgressChange = (val: number[]) => {
        setProgress(val[0])
    }

    const handleProgressCommit = (val: number[]) => {
        onUpdateProgress(task.id, val[0])
    }

    const isLaunched = task.status !== "PENDING"
    const isCompleted = task.status === "FINAL_DONE"

    return (
        <Card className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">{task.title}</CardTitle>
                <Badge variant={isCompleted ? "default" : isLaunched ? "secondary" : "outline"}>
                    {task.status.replace("_", " ")}
                </Badge>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-500 mb-4">{task.description}</p>

                {isLaunched && !isCompleted && (
                    <div className="mb-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Avancement: {progress}%</span>
                        </div>
                        <Slider
                            value={[progress]}
                            max={100}
                            step={5}
                            onValueChange={handleProgressChange}
                            onValueCommit={handleProgressCommit}
                        />
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    {task.pvFileUrl && (
                        <div className="text-xs text-blue-600 flex items-center">
                            <FileText className="w-4 h-4 mr-1" /> PV Uploadé
                        </div>
                    )}
                    {task.siteImageUrl && (
                        <div className="text-xs text-blue-600 flex items-center">
                            <Camera className="w-4 h-4 mr-1" /> Photo Uploadée
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                {!isLaunched ? (
                    <Button className="w-full" onClick={() => onLaunch(task.id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Lancer la tâche
                    </Button>
                ) : !isCompleted ? (
                    <>
                        <Button variant="outline" size="sm" onClick={() => onUploadPhoto(task.id)}>
                            <Camera className="w-4 h-4 mr-2" />
                            Photo
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onUploadPV(task.id)}>
                            <Upload className="w-4 h-4 mr-2" />
                            PV
                        </Button>
                        <Button variant="default" size="sm" onClick={() => onUpdateProgress(task.id, 100)} className="ml-auto">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Terminer
                        </Button>
                    </>
                ) : (
                    <div className="text-sm text-green-600 font-medium w-full text-center">
                        Tâche terminée
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}
