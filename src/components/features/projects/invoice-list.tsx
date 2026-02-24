"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { Plus, FileText, CheckCircle, Clock } from "lucide-react"

interface InvoiceListProps {
    projectId: string
}

export function InvoiceList({ projectId }: InvoiceListProps) {
    const router = useRouter()
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    useEffect(() => {
        fetchInvoices()
    }, [projectId])

    const fetchInvoices = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/invoices`)
            if (res.ok) {
                const data = await res.json()
                setInvoices(data)
            }
        } catch (error) {
            console.error("Failed to fetch invoices:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateInvoice = async (data: any) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                const newInvoice = await res.json()
                setIsCreateDialogOpen(false)
                // Navigate to edit page immediately
                router.push(`/projects/${projectId}/invoices/${newInvoice.id}/edit`)
            }
        } catch (error) {
            console.error("Failed to create invoice:", error)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Historique des Factures</h3>
                <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nouvelle Facture
                </Button>
            </div>

            {loading ? (
                <p className="text-gray-500 text-sm">Chargement des factures...</p>
            ) : invoices.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune facture créée.</p>
            ) : (
                <div className="grid gap-4">
                    {invoices.map((invoice) => (
                        <Card
                            key={invoice.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/projects/${projectId}/invoices/${invoice.id}/edit`)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{invoice.number}</div>
                                        <div className="text-sm text-gray-500">{new Date(invoice.date).toLocaleDateString('fr-FR')}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="font-bold">{formatCurrency(invoice.totalAmount, "DZD")}</div>
                                        <div className="text-xs text-gray-500">{invoice._count?.items || 0} articles</div>
                                    </div>
                                    <Badge variant={invoice.status === 'VALIDATED' ? 'default' : 'secondary'} className={invoice.status === 'VALIDATED' ? 'bg-green-600' : ''}>
                                        {invoice.status === 'VALIDATED' ? <><CheckCircle className="w-3 h-3 mr-1" /> Validée</> : <><Clock className="w-3 h-3 mr-1" /> Brouillon</>}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            {isCreateDialogOpen && (
                <CreateInvoiceDialog
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                    onSubmit={handleCreateInvoice}
                />
            )}
        </div>
    )
}

// Simple internal dialog for creation
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function CreateInvoiceDialog({ open, onOpenChange, onSubmit }: any) {
    const [number, setNumber] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    const handleSubmit = () => {
        if (!number) return
        onSubmit({ number, date })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nouvelle Facture / Situation</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="number" className="text-right">Numéro</Label>
                        <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} className="col-span-3" placeholder="Ex: FACT-2025-01" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Créer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
