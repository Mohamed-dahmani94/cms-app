"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function EditTaskPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [phases, setPhases] = useState<any[]>([]);
    const [engineers, setEngineers] = useState<any[]>([]);

    // Load task + supporting data
    useEffect(() => {
        async function fetchData() {
            try {
                const taskRes = await fetch(`/api/tasks/${id}`);
                if (!taskRes.ok) throw new Error("Failed to fetch task");
                const taskData = await taskRes.json();

                const [phasesRes, usersRes] = await Promise.all([
                    fetch(`/api/projects/${taskData.projectId}/phases`),
                    fetch(`/api/users`),
                ]);

                const phasesData = await phasesRes.json();
                const usersData = await usersRes.json();

                setTask(taskData);
                setPhases(phasesData);
                setEngineers(usersData.filter((u: any) => u.role === "ENGINEER"));
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchData();
    }, [id]);

    if (loading) return <p className="p-8">Chargement…</p>;
    if (!task) return <p className="p-8">Tâche introuvable.</p>;

    const handleChange = (field: string, value: any) => {
        setTask((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task),
        });
        if (res.ok) router.push("/tasks/dashboard");
        else alert("Erreur lors de la sauvegarde.");
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Modifier la tâche</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                        value={task.title}
                        onChange={(e) => handleChange("title", e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                        value={task.description ?? ""}
                        onChange={(e) => handleChange("description", e.target.value)}
                        rows={3}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                        value={task.status}
                        onValueChange={(v) => handleChange("status", v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PENDING">En attente</SelectItem>
                            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                            <SelectItem value="PRELIMINARY_DONE">Terminé (Préliminaire)</SelectItem>
                            <SelectItem value="FINAL_DONE">Terminé (Final)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select
                        value={task.priority}
                        onValueChange={(v) => handleChange("priority", v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Priorité" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LOW">Faible</SelectItem>
                            <SelectItem value="MEDIUM">Moyenne</SelectItem>
                            <SelectItem value="HIGH">Élevée</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Date de début</Label>
                        <Input
                            type="date"
                            value={task.startDate?.slice(0, 10) ?? ""}
                            onChange={(e) => handleChange("startDate", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Date d’échéance</Label>
                        <Input
                            type="date"
                            value={task.dueDate?.slice(0, 10) ?? ""}
                            onChange={(e) => handleChange("dueDate", e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Phase</Label>
                    <Select
                        value={task.phaseId ?? "none"}
                        onValueChange={(v) => handleChange("phaseId", v === "none" ? null : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Phase" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Aucune</SelectItem>
                            {phases.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Ingénieur assigné</Label>
                    <Select
                        value={task.assignedToId ?? "none"}
                        onValueChange={(v) => handleChange("assignedToId", v === "none" ? null : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Ingénieur" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Aucun</SelectItem>
                            {engineers.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                    {e.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button type="submit">
                        Enregistrer les modifications
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Annuler
                    </Button>
                </div>
            </form>
        </div>
    );
}
