
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Image as ImageIcon, Download } from "lucide-react"

export default function SubcontractorDocumentsPage() {
    const [documents, setDocuments] = useState<any[]>([]) // Combined list of docs
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Fetch tasks and extract docs
        // Ideal: dedicated endpoint /api/subcontractor/documents
        // For now, reuse planning endpoint which returns tasks, and extract files
        fetchDocs()
    }, [])

    const fetchDocs = async () => {
        try {
            const res = await fetch("/api/subcontractor/planning")
            if (res.ok) {
                const tasks = await res.json()

                const docs: any[] = []
                tasks.forEach((t: any) => {
                    if (t.pvFileUrl) {
                        docs.push({
                            id: t.id + "_pv",
                            name: `PV - ${t.title}`,
                            type: "PV",
                            url: t.pvFileUrl,
                            date: t.finalDoneAt || t.updatedAt
                        })
                    }
                    if (t.siteImageUrl) {
                        docs.push({
                            id: t.id + "_photo",
                            name: `Photo - ${t.title}`,
                            type: "PHOTO",
                            url: t.siteImageUrl,
                            date: t.updatedAt
                        })
                    }
                    // Could add technical docs here if linked
                })

                setDocuments(docs)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div>Chargement des documents...</div>

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Documents</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => (
                    <Card key={doc.id}>
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <div className={`p-4 rounded-full mb-4 ${doc.type === 'PV' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                {doc.type === 'PV' ? <FileText className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                            </div>
                            <h3 className="font-semibold mb-1 truncate w-full">{doc.name}</h3>
                            <p className="text-xs text-gray-500 mb-4">{new Date(doc.date).toLocaleDateString()}</p>

                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="w-full">
                                <button className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                                    <Download className="w-4 h-4" />
                                    Télécharger
                                </button>
                            </a>
                        </CardContent>
                    </Card>
                ))}

                {documents.length === 0 && (
                    <p className="text-gray-500 col-span-full">Aucun document trouvé.</p>
                )}
            </div>
        </div>
    )
}
