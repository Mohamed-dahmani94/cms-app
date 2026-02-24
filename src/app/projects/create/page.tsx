"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';

export default function CreateProjectPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [client, setClient] = useState("");
    const [estimatedCost, setEstimatedCost] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusValue, setStatusValue] = useState("ACTIVE");

    // Import state
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [parsedStructure, setParsedStructure] = useState<any[]>([]);
    const [showValidation, setShowValidation] = useState(false);

    // Helper to parse Excel date (serial number or string)
    const parseExcelDate = (value: any): string => {
        if (!value) return "";

        // If it's a number (Excel serial date)
        if (typeof value === 'number') {
            const date = new Date(Math.round((value - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
        }

        // If it's a string, try to parse it
        if (typeof value === 'string') {
            // Try DD/MM/YYYY
            if (value.includes('/')) {
                const parts = value.split('/');
                if (parts.length === 3) {
                    // Assume DD/MM/YYYY
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
            // Try YYYY-MM-DD
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        }
        return "";
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImportFile(file);
            setIsImporting(true);
            setParsedStructure([]);

            try {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });

                // Parse Configuration
                if (workbook.SheetNames.includes('Configuration')) {
                    const sheet = workbook.Sheets['Configuration'];
                    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

                    for (const row of data) {
                        if (row[0] && row[1]) {
                            const field = String(row[0]).trim();
                            const value = row[1];

                            if (field === 'Nom de projet') setName(value);
                            else if (field === 'Description') setDescription(value);
                            else if (field === 'Lieu') setLocation(value);
                            else if (field === 'Client') setClient(value);
                            else if (field === 'Coût Estimé (Marché)') setEstimatedCost(String(value));
                            else if (field === 'Date Marché' || field === 'Date de début') setStartDate(parseExcelDate(value));
                            else if (field === 'Date de fin') setEndDate(parseExcelDate(value));
                        }
                    }
                }

                // Parse Structure for Validation
                if (workbook.SheetNames.includes('Structure Marche')) {
                    const sheet = workbook.Sheets['Structure Marche'];
                    const data = XLSX.utils.sheet_to_json(sheet) as any[];
                    setParsedStructure(data);
                    setShowValidation(true);
                }

            } catch (error) {
                console.error("Error parsing Excel:", error);
            } finally {
                setIsImporting(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        try {
            // 1. Create Project
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    location,
                    startDate,
                    endDate,
                    status: statusValue,
                    client,
                    estimatedCost
                }),
            });

            if (res.ok) {
                const project = await res.json();

                // 2. If file selected, upload it
                if (importFile) {
                    const formData = new FormData();
                    formData.append('file', importFile);

                    await fetch(`/api/projects/${project.id}/import-market`, {
                        method: 'POST',
                        body: formData
                    });
                }

                router.push(`/projects/${project.id}`);
            } else {
                console.error("Failed to create project", await res.text());
            }
        } catch (error) {
            console.error("Error creating project:", error);
        }
    };

    if (status === "loading") return <p>Loading...</p>;
    if (!session || session.user.role !== "ADMIN") return <p>Accès refusé.</p>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Créer un nouveau projet</h1>
                <div className="relative">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isImporting}
                    />
                    <Button variant="outline" className="gap-2" disabled={isImporting}>
                        <Upload className="h-4 w-4" />
                        {isImporting ? "Lecture..." : "Importer depuis Excel"}
                    </Button>
                </div>
            </div>

            {importFile && (
                <div className="mb-6 space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-medium text-blue-900">Fichier sélectionné : {importFile.name}</p>
                            <p className="text-xs text-blue-700">Les données du projet ont été pré-remplies.</p>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-auto text-blue-700 hover:text-blue-900" onClick={() => {
                            setImportFile(null);
                            setParsedStructure([]);
                            setShowValidation(false);
                            setName("");
                            setDescription("");
                            setLocation("");
                            setClient("");
                            setEstimatedCost("");
                        }}>
                            Effacer
                        </Button>
                    </div>

                    {/* Validation Preview */}
                    {showValidation && parsedStructure.length > 0 && (
                        <div className="border rounded-lg p-4 bg-white shadow-sm">
                            <h3 className="font-semibold mb-2">Aperçu de la structure ({parsedStructure.length} éléments trouvés)</h3>
                            <div className="max-h-60 overflow-auto border rounded text-xs">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="p-2 border-b">LOT</th>
                                            <th className="p-2 border-b">Article</th>
                                            <th className="p-2 border-b">Tâche</th>
                                            <th className="p-2 border-b">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedStructure.slice(0, 50).map((row, i) => (
                                            <tr key={i} className="border-b hover:bg-gray-50">
                                                <td className="p-2">{row['LOT']}</td>
                                                <td className="p-2">{row['Article']} - {row['Désignation Article']}</td>
                                                <td className="p-2">{row['Tâche']} - {row['Désignation Tâche']}</td>
                                                <td className="p-2">{row['Montant Total']}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedStructure.length > 50 && (
                                    <div className="p-2 text-center text-gray-500 bg-gray-50">
                                        ... et {parsedStructure.length - 50} autres éléments
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Vérifiez que les colonnes correspondent bien. Si des données sont manquantes, corrigez le fichier Excel et réimportez-le.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">Nom du projet</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="location">Lieu</Label>
                    <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="client">Client</Label>
                        <Input id="client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nom du client" />
                    </div>
                    <div>
                        <Label htmlFor="estimatedCost">Coût estimé</Label>
                        <Input id="estimatedCost" type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0.00" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="startDate">Date de début</Label>
                        <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="endDate">Date de fin</Label>
                        <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>
                <div>
                    <Label htmlFor="status">Statut</Label>
                    <Select onValueChange={setStatusValue} value={statusValue}>
                        <SelectTrigger id="status">
                            <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ACTIVE">Actif</SelectItem>
                            <SelectItem value="COMPLETED">Terminé</SelectItem>
                            <SelectItem value="ON_HOLD">En pause</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isImporting}>
                    {importFile ? "Créer et Importer" : "Créer le projet"}
                </Button>
            </form>
        </div>
    );
}
