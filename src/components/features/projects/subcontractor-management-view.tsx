
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, User, FileText, DollarSign, Calendar } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface SubcontractorManagementViewProps {
    projectId: string
}

import { SubcontractDetailsView } from "./subcontract-details-view"
import { SubcontractWizard } from "../subcontracts/subcontract-wizard"

export function SubcontractorManagementView({ projectId }: SubcontractorManagementViewProps) {
    const [subcontracts, setSubcontracts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [selectedSubcontractId, setSelectedSubcontractId] = useState<string | null>(null)

    useEffect(() => {
        if (!selectedSubcontractId) {
            fetchData()
        }
    }, [projectId, selectedSubcontractId])

    const fetchData = async () => {
        try {
            const subsRes = await fetch(`/api/subcontracts?projectId=${projectId}`)
            if (subsRes.ok) {
                setSubcontracts(await subsRes.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Determine status color
    const getStatusBadge = (status: string) => {
        const colors: any = {
            DRAFT: "bg-gray-200 text-gray-800",
            ACTIVE: "bg-blue-100 text-blue-800",
            COMPLETED: "bg-green-100 text-green-800",
            ARCHIVED: "bg-yellow-100 text-yellow-800"
        }
        return <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status] || "bg-gray-100"}`}>{status}</span>
    }

    if (selectedSubcontractId) {
        return <SubcontractDetailsView subcontractId={selectedSubcontractId} onBack={() => setSelectedSubcontractId(null)} />
    }

    if (loading) return <div>Chargement...</div>

    return (
        <div className="space-y-6">
            {!isCreateOpen && (
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Sous-traitants du Projet</h2>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nouveau Contrat
                    </Button>
                </div>
            )}

            {/* View Switching */}
            {isCreateOpen ? (
                <div className="border rounded-lg p-6 bg-white shadow-sm">
                    <SubcontractWizard
                        projectId={projectId}
                        onCancel={() => setIsCreateOpen(false)}
                        onSuccess={() => {
                            setIsCreateOpen(false)
                            fetchData()
                        }}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subcontracts.map(sub => (
                        <Card key={sub.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium truncate pr-4" title={sub.name}>
                                    {sub.name}
                                </CardTitle>
                                {getStatusBadge(sub.status)}
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm mt-2">
                                    <div className="flex items-center text-gray-600">
                                        <User className="w-4 h-4 mr-2" />
                                        {sub.subcontractor?.name}
                                    </div>
                                    <div className="flex items-center text-gray-600">
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        {formatCurrency(sub.totalAmount, "DZD")}
                                    </div>
                                    <div className="flex items-center text-gray-600">
                                        <FileText className="w-4 h-4 mr-2" />
                                        {((sub.tasks?.length || 0)) > 0 ?
                                            `${sub.tasks?.length} Tâches` : "Aucune tâche"}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t flex gap-2">
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedSubcontractId(sub.id)}>
                                        Gérer
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {subcontracts.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            Aucun contrat de sous-traitance pour ce projet. Commencer par en créer un.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
