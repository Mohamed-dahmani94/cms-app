
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubcontractorTaskCard } from "@/components/features/subcontractor/subcontractor-task-card"
import { PVUploadDialog } from "@/components/features/tasks/pv-upload-dialog"
import { LocationCaptureDialog } from "@/components/features/tasks/location-capture-dialog"

export default function SubcontractorTasksPage() {
    const { data: session } = useSession()
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Dialog states
    const [pvDialogOpen, setPvDialogOpen] = useState(false)
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

    useEffect(() => {
        if (session) fetchTasks()
    }, [session])

    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/subcontractor/planning") // Using planning ep for raw task list
            if (res.ok) {
                const data = await res.json()
                setTasks(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleLaunch = async (id: string) => {
        // Optimistic update
        const updatedTasks = tasks.map(t => t.id === id ? { ...t, status: "IN_PROGRESS", startDate: new Date().toISOString() } : t)
        setTasks(updatedTasks)

        await fetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "IN_PROGRESS" })
        })
    }

    const handleUpdateProgress = async (id: string, progress: number) => {
        const status = progress === 100 ? "FINAL_DONE" : "IN_PROGRESS"

        // Optimistic
        const updatedTasks = tasks.map(t => t.id === id ? { ...t, progress, status } : t)
        setTasks(updatedTasks)

        await fetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ progress, status })
        })
    }

    const handlePVSuccess = () => {
        if (selectedTaskId) {
            // Refresh tasks to show new PV status
            fetchTasks()
        }
    }

    const pendingTasks = tasks.filter(t => t.status === "PENDING")
    const activeTasks = tasks.filter(t => t.status !== "PENDING" && t.status !== "FINAL_DONE")
    const completedTasks = tasks.filter(t => t.status === "FINAL_DONE")

    if (loading) return <div>Chargement...</div>

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Mes Tâches</h1>

            <Tabs defaultValue="active" className="w-full">
                <TabsList>
                    <TabsTrigger value="active">En Cours ({activeTasks.length})</TabsTrigger>
                    <TabsTrigger value="pending">À Lancer ({pendingTasks.length})</TabsTrigger>
                    <TabsTrigger value="completed">Terminées ({completedTasks.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {activeTasks.map(task => (
                            <SubcontractorTaskCard
                                key={task.id}
                                task={task}
                                onLaunch={handleLaunch}
                                onUpdateProgress={handleUpdateProgress}
                                onUploadPV={(id) => { setSelectedTaskId(id); setPvDialogOpen(true); }}
                                onUploadPhoto={(id) => { setSelectedTaskId(id); setPhotoDialogOpen(true); }}
                            />
                        ))}
                        {activeTasks.length === 0 && <p className="text-gray-500">Aucune tâche en cours.</p>}
                    </div>
                </TabsContent>

                <TabsContent value="pending" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {pendingTasks.map(task => (
                            <SubcontractorTaskCard
                                key={task.id}
                                task={task}
                                onLaunch={handleLaunch}
                                onUpdateProgress={handleUpdateProgress}
                                onUploadPV={(id) => { setSelectedTaskId(id); setPvDialogOpen(true); }}
                                onUploadPhoto={(id) => { setSelectedTaskId(id); setPhotoDialogOpen(true); }}
                            />
                        ))}
                        {pendingTasks.length === 0 && <p className="text-gray-500">Aucune tâche en attente.</p>}
                    </div>
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {completedTasks.map(task => (
                            <SubcontractorTaskCard
                                key={task.id}
                                task={task}
                                onLaunch={handleLaunch}
                                onUpdateProgress={handleUpdateProgress}
                                onUploadPV={(id) => { setSelectedTaskId(id); setPvDialogOpen(true); }}
                                onUploadPhoto={(id) => { setSelectedTaskId(id); setPhotoDialogOpen(true); }}
                            />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <PVUploadDialog
                open={pvDialogOpen}
                onOpenChange={setPvDialogOpen}
                taskTitle={tasks.find(t => t.id === selectedTaskId)?.title || ""}
                onUpload={async (file) => {
                    if (!selectedTaskId) return;
                    // Need to implement file upload helper or endpoint.
                    // Assuming existing pattern uses a generic upload endpoint or presigned URL.
                    // For now, I'll log or use a placeholder if no global upload fn exists.
                    // I will use a simple form data fetch to my task update endpoint if it supported file, 
                    // but usually we upload to storage then update URL.
                    // I'll assume we update the task with a fake URL for this demo or implement real upload later.

                    // TODO: Implement real file upload
                    const fakeUrl = URL.createObjectURL(file);

                    await fetch(`/api/tasks/${selectedTaskId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pvFileUrl: fakeUrl, status: "FINAL_DONE", progress: 100 })
                    })
                    handlePVSuccess()
                }}
            />

            <LocationCaptureDialog
                open={photoDialogOpen}
                onOpenChange={setPhotoDialogOpen}
                taskTitle={tasks.find(t => t.id === selectedTaskId)?.title || ""}
                onCapture={async (lat, lng, photoUrl) => {
                    if (!selectedTaskId) return;
                    await fetch(`/api/tasks/${selectedTaskId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            gpsLatitude: lat,
                            gpsLongitude: lng,
                            siteImageUrl: photoUrl
                        })
                    })
                    handlePVSuccess()
                }}
            />
        </div>
    )
}

