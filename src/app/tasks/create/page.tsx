"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from 'xlsx';

export default function CreateTaskPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [projectId, setProjectId] = useState("");
    const [assignedToId, setAssignedToId] = useState("");
    const [isFuzzy, setIsFuzzy] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [priority, setPriority] = useState("MEDIUM");
    const [parentTaskId, setParentTaskId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [predecessorId, setPredecessorId] = useState("");

    const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
    const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
    const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([]);

    // Load projects, users and existing tasks for dropdowns
    useEffect(() => {
        if (status === "authenticated") {
            // Fetch projects
            fetch("/api/projects")
                .then((res) => res.json())
                .then(setProjects)
                .catch(console.error);

            // Fetch users (engineers) for assignment
            fetch("/api/users")
                .then((res) => res.json())
                .then(setUsers)
                .catch(console.error);

            // Fetch tasks to allow selecting a parent task (subtask)
            fetch("/api/tasks")
                .then((res) => res.json())
                .then(setTasks)
                .catch(console.error);
        }
    }, [status]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        const payload: any = {
            title,
            description,
            projectId,
            assignedToId: assignedToId || undefined,
            isFuzzy,
            isLocked,
            priority,
            dueDate,
            predecessorId: predecessorId || undefined,
        };
        if (parentTaskId) payload.parentTaskId = parentTaskId;

        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            router.push("/tasks");
        } else {
            console.error("Failed to create task", await res.text());
        }
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            let successCount = 0;
            let failCount = 0;

            for (const row of data as any[]) {
                const payload = {
                    title: row.title || row.Title || "Untitled Task",
                    description: row.description || row.Description || "",
                    projectId: projectId, // Use selected project
                    assignedToId: assignedToId || undefined, // Use selected user
                    priority: row.priority || row.Priority || "MEDIUM",
                    isFuzzy: row.isFuzzy || row.IsFuzzy || false,
                    isLocked: row.isLocked || row.IsLocked || false,
                };

                try {
                    const res = await fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch (err) {
                    failCount++;
                }
            }

            alert(`Import terminé: ${successCount} succès, ${failCount} échecs.`);
            router.push("/tasks");
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { Title: "Exemple Tâche 1", Description: "Description de la tâche", Priority: "MEDIUM", IsFuzzy: false, IsLocked: false },
            { Title: "Exemple Tâche 2", Description: "Autre tâche", Priority: "HIGH", IsFuzzy: true, IsLocked: false }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        XLSX.writeFile(wb, "template_taches.xlsx");
    };

    if (status === "loading") return <p>Loading...</p>;
    if (!session) return <p>Vous devez être connecté pour créer des tâches.</p>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="mb-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    ← Retour
                </Button>
            </div>

            <div className="mb-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                <h2 className="text-lg font-semibold mb-2">Importer depuis Excel</h2>
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-500">
                        Sélectionnez un projet et un ingénieur ci-dessous, puis chargez un fichier Excel avec les colonnes :
                        Title, Description, Priority (LOW/MEDIUM/HIGH).
                    </p>
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                        Télécharger le modèle
                    </Button>
                </div>
                <Input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </div>

            <h1 className="text-2xl font-bold mb-4">Créer une tâche / sous‑tâche manuellement</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="project">Projet (Requis pour import Excel)</Label>
                    <Select onValueChange={setProjectId} value={projectId}>
                        <SelectTrigger id="project">
                            <SelectValue placeholder="Sélectionner un projet" />
                        </SelectTrigger>
                        <SelectContent>
                            {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="assignedTo">Assigner à (Optionnel pour import Excel)</Label>
                    <Select onValueChange={setAssignedToId} value={assignedToId}>
                        <SelectTrigger id="assignedTo">
                            <SelectValue placeholder="Sélectionner un ingénieur" />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="fuzzy" checked={isFuzzy} onCheckedChange={(c) => setIsFuzzy(!!c)} />
                    <Label htmlFor="fuzzy">Fuzzy</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="locked" checked={isLocked} onCheckedChange={(c) => setIsLocked(!!c)} />
                    <Label htmlFor="locked">Locked</Label>
                </div>
                <div>
                    <Label htmlFor="priority">Priorité</Label>
                    <Select onValueChange={setPriority} value={priority}>
                        <SelectTrigger id="priority">
                            <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="parentTask">Tâche parente (pour sous‑tâche)</Label>
                    <Select onValueChange={setParentTaskId} value={parentTaskId}>
                        <SelectTrigger id="parentTask">
                            <SelectValue placeholder="Aucune (tâche principale)" />
                        </SelectTrigger>
                        <SelectContent>
                            {tasks.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="dueDate">Date limite</Label>
                    <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="predecessor">Prédécesseur (Dépendance)</Label>
                    <Select onValueChange={setPredecessorId} value={predecessorId}>
                        <SelectTrigger id="predecessor">
                            <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                            {tasks.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button type="submit" className="w-full">
                    Créer la tâche
                </Button>
            </form>
            <hr className="my-6" />
            <ExportWorksButton />
        </div>
    );
}

function ExportWorksButton() {
    const handleExport = async () => {
        const res = await fetch("/api/tasks/export");
        if (!res.ok) return alert("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tasks_export.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Button variant="outline" onClick={handleExport}>
            Exporter les travaux (JSON)
        </Button>
    );
}
