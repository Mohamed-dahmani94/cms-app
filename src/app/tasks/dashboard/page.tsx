"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { List } from "lucide-react";

export default function TasksDashboard() {
    const router = useRouter();
    const [tasks, setTasks] = useState<any[]>([]);
    const [phases, setPhases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        async function load() {
            try {
                const [sessRes, tasksRes, projectsRes] = await Promise.all([
                    fetch("/api/auth/session"),
                    fetch("/api/tasks"),
                    fetch("/api/projects"),
                ]);
                const sess = await sessRes.json();
                setSession(sess);
                const tasksData = await tasksRes.json();
                const projects = await projectsRes.json();
                // flatten phases from all projects
                const allPhases = projects.flatMap((p: any) => p.phases ?? []);
                setPhases(allPhases);
                setTasks(tasksData);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const handlePhaseChange = async (taskId: string, newPhaseId: string | null) => {
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phaseId: newPhaseId }),
        });
        if (res.ok) {
            setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, phaseId: newPhaseId } : t))
            );
        }
    };

    if (loading) return <p className="p-8">Chargement…</p>;

    // Group tasks by phaseId (or “none”)
    const grouped = tasks.reduce((acc: any, task) => {
        const key = task.phaseId || "none";
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {});

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Tableau de bord des tâches</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/tasks")}>
                        <List className="mr-2 h-4 w-4" /> Liste
                    </Button>
                    <Button onClick={() => router.push("/tasks/create")}>Nouvelle Tâche</Button>
                </div>
            </div>

            {Object.entries(grouped).map(([phaseId, tasksInPhase]: [string, any]) => {
                const phase = phases.find((p) => p.id === phaseId);
                return (
                    <section key={phaseId} className="space-y-4">
                        <h2 className="text-xl font-semibold border-b pb-2">
                            {phase ? phase.name : "Sans phase"}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasksInPhase.map((task: any) => (
                                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-base font-medium truncate pr-2" title={task.title}>
                                            {task.title}
                                        </CardTitle>
                                        <Badge variant={task.status === "FINAL_DONE" ? "default" : "outline"}>
                                            {task.status}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-gray-500">
                                            Début: {task.startDate?.slice(0, 10) || "—"} <br />
                                            Échéance: {task.dueDate?.slice(0, 10) || "—"}
                                        </p>

                                        {/* Phase selector for admins */}
                                        {session?.user?.role === "ADMIN" && (
                                            <div className="space-y-1">
                                                <span className="text-xs text-gray-400">Phase:</span>
                                                <Select
                                                    value={task.phaseId ?? "none"}
                                                    onValueChange={(v) => handlePhaseChange(task.id, v === "none" ? null : v)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Choisir une phase" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Sans phase</SelectItem>
                                                        {phases.map((p) => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => router.push(`/tasks/${task.id}/edit`)}
                                        >
                                            Modifier
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                );
            })}

            {tasks.length === 0 && (
                <p className="text-center text-gray-500 mt-10">Aucune tâche trouvée.</p>
            )}
        </div>
    );
}
