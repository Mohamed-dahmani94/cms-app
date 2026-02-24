"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { Loader2, Save, Printer, Lock, CheckCircle2 } from "lucide-react"

interface InvoiceDetailsDialogProps {
    invoiceId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

interface InvoiceItem {
    id: string
    designation: string
    unit: string
    unitPrice: number
    previousPercentage: number
    previousQuantity: number
    totalPercentage: number
    marketQuantity: number
    article?: {
        code: string
    }
}

interface Invoice {
    id: string
    number: string
    date: string
    status: string
    totalAmount: number
    project?: {
        currencyUnit?: string
        currencyDecimals?: number
        quantityDecimals?: number
    }
    items: InvoiceItem[]
}

export function InvoiceDetailsDialog({ invoiceId, open, onOpenChange, onUpdate }: InvoiceDetailsDialogProps) {
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [edits, setEdits] = useState<Record<string, string>>({}) // { itemId: newPercentageString }

    const fetchInvoice = useCallback(async () => {
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
    }, [invoiceId])

    useEffect(() => {
        if (open && invoiceId) {
            fetchInvoice()
            setEdits({})
        }
    }, [open, invoiceId, fetchInvoice])

    const handlePercentageChange = (itemId: string, value: string) => {
        setEdits(prev => ({ ...prev, [itemId]: value }))
    }

    const saveChanges = async () => {
        setSaving(true)
        try {
            // Convert edits to array
            const updates = Object.entries(edits).map(([id, percentage]) => ({
                id,
                totalPercentage: parseFloat(percentage)
            }))

            const res = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updates })
            })

            if (res.ok) {
                fetchInvoice()
                setEdits({})
                onUpdate()
            }
        } catch (error) {
            console.error("Failed to save changes:", error)
        } finally {
            setSaving(false)
        }
    }

    const validateInvoice = async () => {
        if (!confirm("Êtes-vous sûr de vouloir valider cette facture ? Elle ne sera plus modifiable.")) return

        try {
            const res = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VALIDATED' })
            })
            if (res.ok) {
                fetchInvoice()
                onUpdate()
            }
        } catch (error) {
            console.error("Failed to validate invoice:", error)
        }
    }

    const markAsPaid = async () => {
        if (!confirm("Marquer cette facture comme COMPTABILISÉE ?")) return

        try {
            const res = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PAID' })
            })
            if (res.ok) {
                fetchInvoice()
                onUpdate()
            }
        } catch (error) {
            console.error("Failed to mark invoice as paid:", error)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="outline">BROUILLON</Badge>
            case 'VALIDATED': return <Badge className="bg-orange-500 hover:bg-orange-600">VALIDÉE</Badge>
            case 'PAID': return <Badge className="bg-green-600 hover:bg-green-700">COMPTABILISÉE</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2 border-b">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl">{invoice ? `Facture ${invoice.number}` : "Chargement..."}</DialogTitle>
                            {invoice && <p className="text-sm text-gray-500">Du {new Date(invoice.date).toLocaleDateString()}</p>}
                        </div>
                        {invoice && (
                            <div className="flex flex-col items-end">
                                <div className="mb-2">
                                    {getStatusBadge(invoice.status)}
                                </div>
                                <div className="text-xl font-bold text-green-700">
                                    {formatCurrency(invoice.totalAmount, "DZD")}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 pt-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs">
                                <tr>
                                    <th className="p-2 text-left border w-16">Code</th>
                                    <th className="p-2 text-left border">Désignation</th>
                                    <th className="p-2 text-center border w-12">U</th>
                                    <th className="p-2 text-right border w-24">P.U.</th>

                                    {/* Previous State */}
                                    <th className="p-2 text-right border w-20 bg-gray-50 text-gray-500">% Préc</th>
                                    <th className="p-2 text-right border w-20 bg-gray-50 text-gray-500">Qté Préc</th>

                                    {/* Editable Cumulative State */}
                                    <th className="p-2 text-center border w-24 bg-blue-50 font-bold border-b-2 border-blue-500 text-blue-700">% Cumulé</th>
                                    <th className="p-2 text-right border w-24 bg-blue-50 font-medium">Qté Cumulé</th>

                                    {/* Calculated Monthly Delta */}
                                    <th className="p-2 text-right border w-20 bg-green-50 text-green-700">% Mois</th>
                                    <th className="p-2 text-right border w-20 bg-green-50 text-green-700">Qté Mois</th>
                                    <th className="p-2 text-right border w-28 bg-green-50 font-bold text-green-800">Montant Mois</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice?.items?.map((item) => {
                                    const isEditing = edits[item.id] !== undefined

                                    // Project Settings
                                    const qDecimals = invoice.project?.quantityDecimals ?? 3
                                    const currency = (invoice.project?.currencyUnit || "DZD") as "DZD" | "EUR"
                                    const currencyDecimals = invoice.project?.currencyDecimals || 2

                                    const roundQty = (val: number) => {
                                        const factor = Math.pow(10, qDecimals)
                                        return Math.round(val * factor) / factor
                                    }

                                    // Values
                                    const prevPercent = item.previousPercentage
                                    const prevQty = item.previousQuantity // Assumed rounded from DB

                                    // 1. Current Cumulative Input
                                    const currentPercentInput = isEditing ? parseFloat(edits[item.id]) : item.totalPercentage
                                    const safePercent = isNaN(currentPercentInput) ? 0 : currentPercentInput

                                    // 2. Calculate Cumulative Quantity (Rounded)
                                    const rawCumulQty = (item.marketQuantity * safePercent) / 100
                                    const cumulQty = roundQty(rawCumulQty)

                                    // 3. Calculate Monthly Deltas
                                    const monthPercentVal = safePercent - prevPercent
                                    const monthPercent = monthPercentVal.toFixed(2)
                                    const monthQty = roundQty(cumulQty - prevQty)
                                    const monthAmount = monthQty * item.unitPrice

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 border-b group text-xs text-gray-700">
                                            <td className="p-2 border text-slate-500">{item.article?.code}</td>
                                            <td className="p-2 border max-w-xs truncate" title={item.designation}>{item.designation}</td>
                                            <td className="p-2 border text-center">{item.unit}</td>
                                            <td className="p-2 border text-right">{formatCurrency(item.unitPrice, currency)}</td>

                                            {/* Previous */}
                                            <td className="p-2 border text-right text-gray-400">{prevPercent}%</td>
                                            <td className="p-2 border text-right text-gray-400">{prevQty.toFixed(qDecimals)}</td>

                                            {/* Cumulative Input */}
                                            <td className="p-2 border text-center bg-blue-50/10 p-0 relative">
                                                {invoice.status === 'DRAFT' ? (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        className="h-8 w-full text-center border-transparent hover:border-blue-300 focus:border-blue-500 bg-transparent text-blue-700 font-bold px-1"
                                                        value={isEditing ? edits[item.id] : item.totalPercentage}
                                                        onChange={(e) => handlePercentageChange(item.id, e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="font-bold text-blue-700 block p-1">{item.totalPercentage}%</span>
                                                )}
                                            </td>
                                            <td className="p-2 border text-right font-medium text-blue-900 bg-blue-50/10">
                                                {cumulQty.toFixed(qDecimals)}
                                            </td>

                                            {/* Monthly Results */}
                                            <td className="p-2 border text-right text-green-600 bg-green-50/10">{monthPercentVal > 0 ? "+" : ""}{monthPercent}%</td>
                                            <td className="p-2 border text-right text-green-600 bg-green-50/10 font-medium">{monthQty.toFixed(qDecimals)}</td>
                                            <td className="p-2 border text-right font-bold text-green-700 bg-green-50/20">
                                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: currencyDecimals, maximumFractionDigits: currencyDecimals }).format(monthAmount)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50">
                    <Button variant="outline" onClick={() => window.open(window.location.pathname + `/invoices/${invoiceId}/print`, '_blank')}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimer Situation
                    </Button>
                    {invoice && invoice.status === 'DRAFT' && (
                        <>
                            <Button variant="ghost" disabled={saving || Object.keys(edits).length === 0} onClick={saveChanges}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Enregistrer modifications
                            </Button>
                            <Button onClick={validateInvoice} className="bg-orange-600 hover:bg-orange-700 text-white">
                                <Lock className="w-4 h-4 mr-2" /> Valider Facture
                            </Button>
                        </>
                    )}
                    {invoice && invoice.status === 'VALIDATED' && (
                        <Button onClick={markAsPaid} className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Comptabiliser
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
