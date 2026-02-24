"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { InteractiveGantt } from "@/components/features/projects/interactive-gantt"
import { FileDown, Printer } from "lucide-react"

export default function PrintPlanningPage() {
    const params = useParams()
    const searchParams = useSearchParams()

    // Read query params for configuration
    const viewMode = searchParams.get('view') as 'global' | 'detailed' || 'detailed'
    const dateMode = searchParams.get('date') as 'theoretical' | 'real' | 'both' || 'both'

    const [mounted, setMounted] = useState(false)
    const [projectName, setProjectName] = useState("")

    useEffect(() => {
        // Fetch project name
        fetch(`/api/projects/${params.id}`)
            .then(res => res.json())
            .then(data => setProjectName(data.name || ""))
            .catch(err => console.error(err))

        setMounted(true)
        // Auto-print removed - User must trigger manually
    }, [params.id])

    if (!mounted) return null

    return (
        <div className="p-4 bg-white min-h-screen">
            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 1cm;
                    }
                    body {
                        background: white;
                    }
                    /* Ensure buttons (chevrons) are VISIBLE for printing if they help readability or if user just collapsed things */
                    /* But normally we don't print "interaction" buttons. */
                    /* The user wants to "leave the hand" -> Before printing. */
                    /* Once printed on paper, buttons are useless. */
                    /* BUT: The user effectively uses this page as a "preview" before hitting Ctrl+P. */
                    /* So we allow buttons on screen, but HIDE them in actual ink print? */
                    /* Or does the user want the printed PDF to look exactly like screen? Usually no buttons on paper. */
                    
                    /* Hiding action buttons: */
                    button {
                        display: none !important;
                    }

                    /* Ensure background graphics (colors) are printed */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            <div className="mb-4 text-center print:hidden">
                <p className="text-sm text-gray-500 mb-2">Configurez l'affichage (développez/réduisez les dossiers) puis imprimez.</p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-lg"
                    >
                        <Printer className="h-4 w-4" />
                        Lancer l'impression
                    </button>
                    <button
                        onClick={() => {
                            // Optional: Show a toast/alert hint?
                            // alert("Choisissez 'Enregistrer au format PDF' dans la fenêtre d'impression.");
                            window.print()
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold shadow-lg"
                        title="Sélectionnez 'Enregistrer au format PDF' dans la fenêtre qui s'ouvre."
                    >
                        <FileDown className="h-4 w-4" />
                        Exporter en PDF
                    </button>
                </div>
            </div>

            <div className="print:w-full">
                <h1 className="text-xl font-bold mb-4">Planning Projet {projectName ? `(${projectName})` : ''}</h1>
                <div className="border rounded p-1">
                    <InteractiveGantt
                        projectId={params.id as string}
                        readOnly={true}
                        printViewMode={viewMode}
                        printDateMode={dateMode}
                    />
                </div>
            </div>
        </div>
    )
}
