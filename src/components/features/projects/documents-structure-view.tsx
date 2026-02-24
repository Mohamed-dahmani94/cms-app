"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Folder, FileText, ChevronRight, ChevronDown, Download, Image as ImageIcon, File, FolderDown } from "lucide-react"

interface Document {
    id: string
    name: string
    url: string
    type: string // "PV_RECEPTION", "PHOTO", "PLAN", etc.
    projectId: string
    article?: { id: string, code: string, designation: string }
    subTask?: { id: string, code: string, designation: string }
}

interface DocumentsStructureViewProps {
    documents: Document[]
}

type Structure = {
    articles: {
        [key: string]: {
            info: { code: string, designation: string },
            subtasks: {
                [key: string]: {
                    info: { code: string, designation: string },
                    files: Document[]
                }
            },
            files: Document[] // Direct article files (e.g. PV)
        }
    },
    others: Document[],
    pvs: Document[] // Added for PVs
}

export function DocumentsStructureView({ documents }: DocumentsStructureViewProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [filterType, setFilterType] = useState<string | null>(null)

    const projectId = documents.length > 0 ? documents[0].projectId : ''

    const toggle = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const handleDownloadZip = (e: React.MouseEvent, scope: string, scopeId?: string) => {
        e.stopPropagation()
        if (!projectId) return
        const url = `/api/projects/${projectId}/zip?scope=${scope}${scopeId ? `&scopeId=${scopeId}` : ''}`
        window.open(url, '_blank')
    }

    const availableTypes = useMemo(() => {
        const types = new Set(documents.map(d => d.type))
        return Array.from(types).filter(Boolean).sort()
    }, [documents])

    const filteredDocuments = useMemo(() => {
        if (!filterType) return documents
        return documents.filter(d => d.type === filterType)
    }, [documents, filterType])

    const structure = useMemo(() => {
        const struct: Structure = { articles: {}, others: [], pvs: [] }

        filteredDocuments.forEach(doc => {
            // Special handling for PVs: group them in a top-level folder
            if (doc.type === 'PV_RECEPTION') {
                struct.pvs.push(doc)
                return
            }

            if (doc.article) {
                const artId = doc.article.id
                if (!struct.articles[artId]) {
                    struct.articles[artId] = {
                        info: doc.article,
                        subtasks: {},
                        files: []
                    }
                }

                if (doc.subTask) {
                    const stId = doc.subTask.id
                    if (!struct.articles[artId].subtasks[stId]) {
                        struct.articles[artId].subtasks[stId] = {
                            info: doc.subTask,
                            files: []
                        }
                    }
                    struct.articles[artId].subtasks[stId].files.push(doc)
                } else {
                    struct.articles[artId].files.push(doc)
                }
            } else {
                struct.others.push(doc)
            }
        })
        return struct
    }, [filteredDocuments])

    const renderFile = (doc: Document) => {
        const isPhoto = doc.type === 'PHOTO' || doc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)
        const isPV = doc.type === 'PV_RECEPTION'

        return (
            <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-gray-50 border-b last:border-0 text-sm pl-8">
                <div className="flex items-center gap-2 overflow-hidden">
                    {isPhoto ? <ImageIcon className="h-4 w-4 text-purple-500 flex-shrink-0" /> :
                        isPV ? <FileText className="h-4 w-4 text-orange-500 flex-shrink-0" /> :
                            <File className="h-4 w-4 text-gray-400 flex-shrink-0" />}

                    <span className="truncate">{doc.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4">{doc.type}</Badge>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3" />
                    </a>
                </Button>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Documents Structurés</CardTitle>
                <div className="flex flex-wrap gap-1 justify-end">
                    <Button
                        variant={filterType === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType(null)}
                        className="text-xs h-7 px-2"
                    >
                        Tous
                    </Button>
                    {availableTypes.map(type => (
                        <Button
                            key={type}
                            variant={filterType === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterType(type)}
                            className={`text-xs h-7 px-2 ${type === 'PV_RECEPTION' ? 'border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 data-[state=active]:bg-orange-500' :
                                type === 'PHOTO' ? 'border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800' : ''
                                } ${filterType === type && type === 'PV_RECEPTION' ? '!bg-orange-500 !text-white' : ''} ${filterType === type && type === 'PHOTO' ? '!bg-purple-500 !text-white' : ''}`}
                        >
                            {type === 'PV_RECEPTION' ? 'PV' :
                                type === 'PHOTO' ? 'Photos' : type}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                {Object.keys(structure.articles).length === 0 && structure.others.length === 0 && structure.pvs.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <p>Aucun document {filterType ? `de type ${filterType}` : ''} trouvé.</p>
                    </div>
                )}

                <div className="space-y-1">
                    {/* PV Folder */}
                    {structure.pvs.length > 0 && (
                        <div className="border rounded-md overflow-hidden mb-2 bg-orange-50/50 border-orange-200">
                            <div
                                className="flex items-center gap-2 p-2 hover:bg-orange-100 cursor-pointer text-orange-900"
                                onClick={() => toggle('pvs')}
                            >
                                {expanded['pvs'] || !!filterType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Folder className="h-4 w-4 text-orange-500" />
                                <div className="flex-1 font-bold text-sm">PV DE RÉCEPTION</div>
                                <Badge variant="secondary" className="bg-white text-orange-600 border border-orange-200 mr-2">{structure.pvs.length}</Badge>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 hover:bg-orange-200"
                                    title="Télécharger tout le dossier PV"
                                    onClick={(e) => handleDownloadZip(e, 'PV')}
                                >
                                    <FolderDown className="h-4 w-4 text-orange-700" />
                                </Button>
                            </div>
                            {(expanded['pvs'] || !!filterType) && (
                                <div className="bg-white border-t border-orange-100">
                                    {structure.pvs.map(renderFile)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Articles folders */}
                    {Object.entries(structure.articles).map(([artId, artData]) => {
                        const isExpanded = expanded[artId] || !!filterType
                        const fileCount = artData.files.length + Object.values(artData.subtasks).reduce((sum, st) => sum + st.files.length, 0)

                        if (fileCount === 0) return null

                        return (
                            <div key={artId} className="border rounded-md overflow-hidden mb-2">
                                <div
                                    className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => toggle(artId)}
                                >
                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                    <Folder className="h-4 w-4 text-blue-500" />
                                    <div className="flex-1 font-medium text-sm">
                                        {artData.info.code} - {artData.info.designation}
                                    </div>
                                    <Badge variant="secondary" className="bg-white text-xs mr-2">{fileCount}</Badge>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        title="Télécharger l'Article complet (ZIP)"
                                        onClick={(e) => handleDownloadZip(e, 'ARTICLE', artId)}
                                    >
                                        <FolderDown className="h-4 w-4 text-blue-600" />
                                    </Button>
                                </div>

                                {isExpanded && (
                                    <div className="bg-white border-t">
                                        {/* Direct files (PV) - Should not be here if moved to PV folder, only if not PV type */}
                                        {artData.files.length > 0 && (
                                            <div className="p-2">
                                                {artData.files.map(renderFile)}
                                            </div>
                                        )}

                                        {/* Subtasks folders */}
                                        {Object.entries(artData.subtasks).map(([stId, stData]) => {
                                            const isStExpanded = expanded[stId] || !!filterType
                                            if (stData.files.length === 0) return null

                                            return (
                                                <div key={stId} className="ml-6 border-l pl-2 my-1">
                                                    <div
                                                        className="flex items-center gap-2 p-1.5 hover:bg-gray-50 cursor-pointer rounded"
                                                        onClick={() => toggle(stId)}
                                                    >
                                                        {isStExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                                                        <Folder className="h-3 w-3 text-indigo-400" />
                                                        <span className="text-xs font-medium truncate flex-1">{stData.info.code} - {stData.info.designation}</span>
                                                        <Badge variant="outline" className="text-[10px] h-5 mr-1">{stData.files.length}</Badge>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-5 w-5"
                                                            title="Télécharger la tâche (ZIP)"
                                                            onClick={(e) => handleDownloadZip(e, 'SUBTASK', stId)}
                                                        >
                                                            <FolderDown className="h-3 w-3 text-indigo-500" />
                                                        </Button>
                                                    </div>

                                                    {isStExpanded && (
                                                        <div className="ml-2">
                                                            {stData.files.map(renderFile)}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Autres Documents */}
                    {structure.others.length > 0 && (
                        <div className="border rounded-md overflow-hidden mt-4">
                            <div
                                className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                                onClick={() => toggle('others')}
                            >
                                {expanded['others'] || !!filterType ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                <Folder className="h-4 w-4 text-gray-500" />
                                <div className="flex-1 font-medium text-sm">Autres Documents / Non Classés</div>
                                <Badge variant="secondary" className="bg-white">{structure.others.length}</Badge>
                            </div>
                            {(expanded['others'] || !!filterType) && (
                                <div className="bg-white border-t">
                                    {structure.others.map(renderFile)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
