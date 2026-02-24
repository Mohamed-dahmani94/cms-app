"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Save, Printer, Lock, ArrowLeft } from "lucide-react"

export default function InvoiceEditPage() {
    const params = useParams()
    const router = useRouter()
    const invoiceId = params.invoiceId as string
    const projectId = params.id as string

    const [invoice, setInvoice] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [edits, setEdits] = useState<Record<string, string>>({}) // { itemId: newPercentageString }
    const [messageDialog, setMessageDialog] = useState<{ open: boolean, title: string, description: string, action?: () => void }>({ open: false, title: "", description: "" })

    useEffect(() => {
        if (invoiceId) {
            fetchInvoice()
        }
    }, [invoiceId])

    const fetchInvoice = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/invoices/${invoiceId}`)
            if (res.ok) {
                const data = await res.json()
                setInvoice(data)
            }
        } catch (error) {
            console.error("Failed to fetch invoice details:", error)
        } finally {
            setLoading(false)
        }
    }

    const handlePercentageChange = (itemId: string, value: string) => {
        setEdits(prev => ({ ...prev, [itemId]: value }))
    }

    const saveChanges = async () => {
        setSaving(true)
        try {
            // Convert edits to array
            const updates = Object.entries(edits).map(([id, percentage]) => {
                const item = invoice.items.find((i: any) => i.id === id)
                const val = parseFloat(percentage)
                // Clamp to previous percentage to avoid negative
                const effectiveVal = item ? Math.max(val, item.previousPercentage) : val
                return {
                    id,
                    totalPercentage: effectiveVal
                }
            })

            const res = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updates })
            })

            if (res.ok) {
                fetchInvoice()
                setEdits({})
                setMessageDialog({ open: true, title: "Succès", description: "Modifications enregistrées avec succès." })
            } else {
                setMessageDialog({ open: true, title: "Erreur", description: "Erreur lors de l'enregistrement." })
            }
        } catch (error) {
            console.error("Failed to save changes:", error)
            setMessageDialog({ open: true, title: "Erreur", description: "Une erreur est survenue lors de l'enregistrement." })
        } finally {
            setSaving(false)
        }
    }

    const validateInvoice = async () => {
        setMessageDialog({
            open: true,
            title: "Validation",
            description: "Êtes-vous sûr de vouloir valider cette facture ? Elle ne sera plus modifiable.",
            action: async () => {
                // Perform Validation
                try {
                    const res = await fetch(`/api/invoices/${invoiceId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'VALIDATED' })
                    })
                    if (res.ok) {
                        fetchInvoice()
                        setMessageDialog({ open: true, title: "Succès", description: "Facture validée avec succès !" })
                    } else {
                        const err = await res.text()
                        setMessageDialog({ open: true, title: "Erreur", description: "Erreur lors de la validation: " + err })
                    }
                } catch (error) {
                    setMessageDialog({ open: true, title: "Erreur", description: "Erreur technique: " + error })
                }
            }
        })
    }

    const accountInvoice = async () => {
        setMessageDialog({
            open: true,
            title: "Comptabilisation",
            description: "Êtes-vous sûr de vouloir comptabiliser cette facture ? Elle ne sera plus du tout modifiable.",
            action: async () => {
                try {
                    const res = await fetch(`/api/invoices/${invoiceId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'ACCOUNTED' })
                    })
                    if (res.ok) {
                        fetchInvoice()
                        setMessageDialog({ open: true, title: "Succès", description: "Facture comptabilisée avec succès !" })
                    } else {
                        const err = await res.text()
                        setMessageDialog({ open: true, title: "Erreur", description: "Erreur lors de la comptabilisation: " + err })
                    }
                } catch (error) {
                    setMessageDialog({ open: true, title: "Erreur", description: "Erreur technique: " + error })
                }
            }
        })
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    if (!invoice) return <div>Facture introuvable</div>

    // Project Settings Calculation Helpers
    const qDecimals = invoice.project?.quantityDecimals ?? 3
    const currency = invoice.project?.currencyUnit || "DZD"
    const currencyDecimals = invoice.project?.currencyDecimals || 2

    const roundQty = (val: number) => {
        const factor = Math.pow(10, qDecimals)
        return Math.round(val * factor) / factor
    }

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: currencyDecimals, maximumFractionDigits: currencyDecimals }).format(amount) + " " + currency
    }

    // Status Badge Logic
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="outline">Brouillon</Badge>
            case 'VALIDATED': return <Badge className="bg-blue-600 hover:bg-blue-700">Validée</Badge>
            case 'ACCOUNTED': return <Badge className="bg-purple-600 hover:bg-purple-700">Comptabilisée</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    const isLocked = invoice.status === 'ACCOUNTED'

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push(`/projects/${projectId}`)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Projet
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Facture {invoice.number}
                            {getStatusBadge(invoice.status)}
                        </h1>
                        <p className="text-sm text-gray-500">Du {new Date(invoice.date).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                        <p className="text-xs text-gray-500 uppercase">Total Situation (HT)</p>
                        <p className="text-xl font-bold text-green-700">{formatMoney(invoice.totalAmount)}</p>
                    </div>

                    <Button variant="outline" onClick={() => window.open(`/projects/${projectId}/invoices/${invoiceId}/print`, '_blank')}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimer
                    </Button>

                    {!isLocked && (
                        <Button variant="secondary" disabled={saving || Object.keys(edits).length === 0} onClick={saveChanges}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Enregistrer
                        </Button>
                    )}

                    {invoice.status === 'DRAFT' && (
                        <Button onClick={validateInvoice} className="bg-green-600 hover:bg-green-700 text-white">
                            <Lock className="w-4 h-4 mr-2" /> Valider
                        </Button>
                    )}

                    {invoice.status === 'VALIDATED' && (
                        <Button onClick={accountInvoice} className="bg-purple-600 hover:bg-purple-700 text-white">
                            <Lock className="w-4 h-4 mr-2" /> Comptabiliser
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content - Table */}
            <div className="flex-1 overflow-auto p-8">
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-slate-50 text-xs border-b">
                            <tr>
                                <th className="p-3 text-left border-r w-16 bg-gray-50">Code</th>
                                <th className="p-3 text-left border-r">Désignation</th>
                                <th className="p-3 text-center border-r w-12">U</th>
                                <th className="p-3 text-right border-r w-24">P.U.</th>

                                {/* Previous State */}
                                <th className="p-3 text-right border-r w-24 bg-gray-50 text-gray-500">% Préc</th>
                                <th className="p-3 text-right border-r w-24 bg-gray-50 text-gray-500">Qté Préc</th>

                                {/* Editable Cumulative State */}
                                <th className="p-3 text-center border-r w-32 bg-blue-50 font-bold border-b-2 border-blue-500 text-blue-700">% Cumulé</th>
                                <th className="p-3 text-right border-r w-28 bg-blue-50 font-medium">Qté Cumulé</th>

                                {/* Calculated Monthly Delta */}
                                <th className="p-3 text-right border-r w-24 bg-green-50 text-green-700">% Mois</th>
                                <th className="p-3 text-right border-r w-24 bg-green-50 text-green-700">Qté Mois</th>
                                <th className="p-3 text-right w-32 bg-green-50 font-bold text-green-800">Montant Mois</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice?.items?.map((item: any) => {
                                const isEditing = edits[item.id] !== undefined

                                // Values
                                const prevPercent = item.previousPercentage
                                const prevQty = item.previousQuantity

                                // 1. Current Cumulative Input
                                const currentPercentInput = isEditing ? parseFloat(edits[item.id]) : item.totalPercentage
                                let safePercent = isNaN(currentPercentInput) ? 0 : currentPercentInput

                                // FORCE CLAMPING: If input < previous, use previous for calculations (prevents negative monthly)
                                // User requirement: "si la qtt du mois precedant plus elver gardes la qtt la plus elver"
                                const effectivePercent = Math.max(safePercent, prevPercent)

                                // 2. Calculate Cumulative Quantity (Rounded)
                                const rawCumulQty = (item.marketQuantity * effectivePercent) / 100
                                const cumulQty = roundQty(rawCumulQty)

                                // 3. Calculate Monthly Deltas
                                // Note: we use effectivePercent for display if we want to show what will be saved
                                const monthPercent = (effectivePercent - prevPercent).toFixed(2)
                                const monthQty = roundQty(cumulQty - prevQty)
                                const monthAmount = monthQty * item.unitPrice

                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 border-b group text-xs text-gray-700">
                                        <td className="p-3 border-r text-slate-500 bg-gray-50/30">{item.article?.code}</td>
                                        <td className="p-3 border-r font-medium text-gray-900">{item.designation}</td>
                                        <td className="p-3 border-r text-center text-gray-500">{item.unit}</td>
                                        <td className="p-3 border-r text-right whitespace-nowrap">{formatMoney(item.unitPrice)}</td>

                                        {/* Previous */}
                                        <td className="p-3 border-r text-right text-gray-400 bg-gray-50/30">{prevPercent}%</td>
                                        <td className="p-3 border-r text-right text-gray-400 bg-gray-50/30">{prevQty.toFixed(qDecimals)}</td>

                                        {/* Cumulative Input */}
                                        <td className="p-0 border-r text-center bg-blue-50/10 relative h-full">
                                            {!isLocked ? (
                                                <Input
                                                    type="number"
                                                    min={item.previousPercentage}
                                                    max="100"
                                                    step="0.01"
                                                    className={`h-full w-full text-center border-none shadow-none focus:ring-0 focus:bg-blue-100 font-bold rounded-none ${safePercent < prevPercent ? "text-red-600 bg-red-50" : "text-blue-700"
                                                        }`}
                                                    title={safePercent < prevPercent ? "Le cumul ne peut pas être inférieur au précédent" : ""}
                                                    value={isEditing ? edits[item.id] : item.totalPercentage}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        handlePercentageChange(item.id, val)
                                                    }}
                                                    onBlur={(e) => {
                                                        // Auto-correct on blur if requested? 
                                                        // User said "gardes la qtt la plus elver", so if they leave it lower, we could snap it back?
                                                        // Let's strictly enforce min constraint visually for now, or maybe snap on save?
                                                        // Better: prevent saving if invalid?
                                                        // Actually, safePercent is used for calculations. 
                                                        // If I want to "keep the highest", I should use Math.max for calculations.
                                                    }}
                                                />
                                            ) : (
                                                <span className="font-bold text-blue-700 block p-3">{item.totalPercentage}%</span>
                                            )}
                                        </td>
                                        <td className="p-3 border-r text-right font-medium text-blue-900 bg-blue-50/10">
                                            {cumulQty.toFixed(qDecimals)}
                                        </td>

                                        {/* Monthly Results */}
                                        <td className="p-3 border-r text-right text-green-600 bg-green-50/10">
                                            {parseFloat(monthPercent) > 0 ? "+" : ""}{monthPercent}%
                                        </td>
                                        <td className="p-3 border-r text-right text-green-600 bg-green-50/10 font-bold">
                                            {monthQty.toFixed(qDecimals)}
                                        </td>
                                        <td className="p-3 text-right font-bold text-green-700 bg-green-50/20 whitespace-nowrap">
                                            {formatMoney(monthAmount)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Message Dialog */}
            <Dialog open={messageDialog.open} onOpenChange={(open) => setMessageDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{messageDialog.title}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {messageDialog.description}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMessageDialog(prev => ({ ...prev, open: false }))}>
                            Fermer
                        </Button>
                        {messageDialog.action && (
                            <Button onClick={() => {
                                messageDialog.action?.()
                                setMessageDialog(prev => ({ ...prev, open: false }))
                            }}>
                                Confirmer
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
