"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ExcelImportDialogProps {
    projectId: string
    onImportComplete?: () => void
}

export function ExcelImportDialog({ projectId, onImportComplete }: ExcelImportDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult(null)
            setError(null)
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setUploading(true)
        setProgress(0)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90))
            }, 200)

            const res = await fetch(`/api/projects/${projectId}/import-market`, {
                method: 'POST',
                body: formData
            })

            clearInterval(progressInterval)
            setProgress(100)

            if (res.ok) {
                const data = await res.json()
                setResult(data.summary)
                setTimeout(() => {
                    onImportComplete?.()
                }, 2000)
            } else {
                const errorData = await res.json()
                setError(errorData.error || "Échec de l'import")
            }
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'upload")
        } finally {
            setUploading(false)
        }
    }

    const resetDialog = () => {
        setFile(null)
        setResult(null)
        setError(null)
        setProgress(0)
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetDialog()
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Importer Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Importer la Structure du Marché</DialogTitle>
                    <DialogDescription>
                        Importez un fichier Excel contenant la configuration complète du projet
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!result && !error && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="excel-file">Fichier Excel</Label>
                                <Input
                                    id="excel-file"
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Format attendu : 2 feuilles (Configuration, Structure Marché)
                                </p>
                                <Button
                                    variant="link"
                                    className="h-auto p-0 text-blue-600"
                                    onClick={() => window.open('/Template_Import_Marche.xlsx', '_blank')}
                                >
                                    Télécharger le modèle Excel
                                </Button>
                            </div>

                            {file && (
                                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                    <FileSpreadsheet className="h-5 w-5" />
                                    <span className="text-sm font-medium">{file.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                        ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                            )}

                            {uploading && (
                                <div className="space-y-2">
                                    <Progress value={progress} />
                                    <p className="text-sm text-center text-muted-foreground">
                                        Import en cours... {progress}%
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
                                    Annuler
                                </Button>
                                <Button onClick={handleUpload} disabled={!file || uploading}>
                                    {uploading ? "Import..." : "Importer"}
                                </Button>
                            </div>
                        </>
                    )}

                    {result && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-medium">Import réussi !</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-muted-foreground">Templates créés</p>
                                    <p className="text-2xl font-bold">{result.templatesCreated}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-muted-foreground">Blocs créés</p>
                                    <p className="text-2xl font-bold">{result.blocksCreated}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-muted-foreground">LOTs créés</p>
                                    <p className="text-2xl font-bold">{result.lotsCreated}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-muted-foreground">Articles créés</p>
                                    <p className="text-2xl font-bold">{result.articlesCreated}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-muted-foreground">Tâches créées</p>
                                    <p className="text-2xl font-bold">{result.tasksCreated}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-muted-foreground">Sous-tâches créées</p>
                                    <p className="text-2xl font-bold">{result.subTasksCreated}</p>
                                </div>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm font-medium text-yellow-800">Avertissements :</p>
                                    <ul className="text-sm text-yellow-700 list-disc list-inside">
                                        {result.errors.map((err: string, i: number) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <Button onClick={() => setOpen(false)} className="w-full">
                                Fermer
                            </Button>
                        </div>
                    )}

                    {error && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-medium">Échec de l'import</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{error}</p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={resetDialog}>
                                    Réessayer
                                </Button>
                                <Button onClick={() => setOpen(false)}>
                                    Fermer
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
