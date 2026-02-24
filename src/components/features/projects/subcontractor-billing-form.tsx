"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon, Calculator, Save, ArrowLeft } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"

interface SubcontractorBillingFormProps {
    subcontractId: string
    onCancel: () => void
    onSuccess: () => void
}

export function SubcontractorBillingForm({ subcontractId, onCancel, onSuccess }: SubcontractorBillingFormProps) {
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [subcontract, setSubcontract] = useState<any>(null)

    // Invoice Meta
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date())
    const [periodStart, setPeriodStart] = useState<Date | undefined>()
    const [periodEnd, setPeriodEnd] = useState<Date | undefined>()

    // Billing State: itemId -> { currentPercentage, currentAmount, previousPercentage, totalPercentage, ... }
    const [billingLines, setBillingLines] = useState<Record<string, any>>({})

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/subcontracts/${subcontractId}`)
                if (res.ok) {
                    const data = await res.json()
                    setSubcontract(data)

                    // Initialize invoice number suggestion
                    const count = (data.bills?.length || 0) + 1
                    setInvoiceNumber(`FACT-${count.toString().padStart(3, '0')}`)

                    // Initialize periods based on last bill
                    if (data.bills && data.bills.length > 0) {
                        const lastBill = data.bills[0] // ordered by date desc
                        if (lastBill.periodEnd) {
                            const nextStart = new Date(lastBill.periodEnd)
                            nextStart.setDate(nextStart.getDate() + 1)
                            setPeriodStart(nextStart)
                        }
                    } else if (data.startDate) {
                        setPeriodStart(new Date(data.startDate))
                    }
                    setPeriodEnd(new Date())

                    // Calculate Previous Totals per Item
                    const previousTotals: Record<string, number> = {} // itemId -> total % billed so far
                    data.bills?.forEach((bill: any) => {
                        // If bill is valid (not DRAFT? or include DRAFT? let's include DRAFT for now or valid)
                        // Actually, purely cumulative logic usually counts VALIDATED/PAID bills.
                        // For simplicity V1, we sum all bills items.
                        bill.items?.forEach((bi: any) => {
                            previousTotals[bi.subcontractItemId] = (previousTotals[bi.subcontractItemId] || 0) + (bi.currentPercentage || 0)
                        })
                    })

                    // Initialize Lines
                    const lines: any = {}
                    const items = data.items || []
                    items.forEach((item: any) => {
                        const prevPct = previousTotals[item.id] || 0
                        lines[item.id] = {
                            previousPercentage: prevPct,
                            currentPercentage: 0,
                            currentAmount: 0,
                            totalPercentage: prevPct,
                            itemTotalAmount: item.totalAmount
                        }
                    })
                    setBillingLines(lines)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [subcontractId])

    const handleLineChange = (itemId: string, field: 'percentage' | 'amount' | 'totalPercentage', value: string) => {
        const numValue = parseFloat(value) || 0
        const item = subcontract.items.find((i: any) => i.id === itemId)
        if (!item) return

        const prevPct = billingLines[itemId]?.previousPercentage || 0
        const itemTotal = item.unitPrice * item.quantity

        if (field === 'percentage') {
            // value is current period % (e.g. 10%)
            // Current Amount = Total * (Current% / 100)
            const currentAmount = itemTotal * (numValue / 100)

            setBillingLines(prev => ({
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    currentPercentage: numValue,
                    currentAmount: currentAmount,
                    totalPercentage: prevPct + numValue
                }
            }))
        } else if (field === 'totalPercentage') {
            // value is Target Total %
            // Current % = Target Total % - Previous %
            let newTotalPct = numValue
            if (newTotalPct < prevPct) newTotalPct = prevPct // Prevent going below previous? Or allow correction? Let's allow but maybe warn. For now strict: valid >= prev

            const currentPct = newTotalPct - prevPct
            const currentAmount = itemTotal * (currentPct / 100)

            setBillingLines(prev => ({
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    currentPercentage: currentPct,
                    currentAmount: currentAmount,
                    totalPercentage: newTotalPct
                }
            }))
        } else {
            // value is Amount
            // Current % = (Current Amount / Total) * 100
            const currentPct = itemTotal > 0 ? (numValue / itemTotal) * 100 : 0

            setBillingLines(prev => ({
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    currentPercentage: currentPct,
                    currentAmount: numValue,
                    totalPercentage: prevPct + currentPct
                }
            }))
        }
    }

    const calculateTotals = () => {
        const progressTotal = Object.values(billingLines).reduce((acc, line) => acc + (line.currentAmount || 0), 0)
        const retentionRate = subcontract?.retentionGuarantee || 0
        const retentionAmount = progressTotal * (retentionRate / 100)
        const netHT = progressTotal - retentionAmount
        const total = netHT

        return { progressTotal, retentionAmount, netHT, total }
    }

    const totals = calculateTotals()

    const handleSubmit = async () => {
        if (!invoiceNumber || !invoiceDate) return
        setSubmitting(true)

        // Build Items Payload
        const itemsPayload = Object.keys(billingLines).map(itemId => {
            const line = billingLines[itemId]
            if (line.currentAmount === 0 && line.currentPercentage === 0) return null // Skip empty lines? Or keep for tracking? Let's skip.
            return {
                subcontractItemId: itemId,
                previousPercentage: line.previousPercentage,
                currentPercentage: line.currentPercentage,
                totalPercentage: line.totalPercentage,
                previousAmount: (line.itemTotalAmount * (line.previousPercentage / 100)),
                currentAmount: line.currentAmount,
                totalAmount: (line.itemTotalAmount * (line.totalPercentage / 100))
            }
        }).filter(Boolean)

        try {
            const res = await fetch(`/api/subcontracts/${subcontractId}/bills`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    number: invoiceNumber,
                    date: invoiceDate,
                    periodStart,
                    periodEnd,
                    progressAmount: totals.progressTotal,
                    retentionAmount: totals.retentionAmount,
                    taxAmount: 0,
                    totalAmount: totals.total,
                    status: "SUBMITTED",
                    items: itemsPayload
                })
            })

            if (res.ok) {
                onSuccess()
            } else {
                console.error("Failed to submit bill")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div>Chargement...</div>

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 border-b pb-4">
                <Button variant="ghost" size="icon" onClick={onCancel}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h2 className="text-xl font-bold">Nouvelle Facture / Situation</h2>
                    <p className="text-sm text-muted-foreground">{subcontract.name} - {formatCurrency(subcontract.totalAmount, "DZD")}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Meta Data */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Numéro</Label>
                                <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Date Facture</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !invoiceDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {invoiceDate ? format(invoiceDate, "dd/MM/yyyy") : <span>Choisir...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} locale={fr} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Début Période</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodStart && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {periodStart ? format(periodStart, "dd/MM/yyyy") : <span>--/--</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} locale={fr} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Fin Période</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodEnd && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {periodEnd ? format(periodEnd, "dd/MM/yyyy") : <span>--/--</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} locale={fr} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Billing Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Détail de la Situation</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-[30%]">Désignation</TableHead>
                                    <TableHead className="text-right">Prix U.</TableHead>
                                    <TableHead className="text-right">Qté</TableHead>
                                    <TableHead className="text-right text-blue-600 border-l">% Préc.</TableHead>
                                    <TableHead className="text-center bg-blue-50 border-x text-blue-800" colSpan={2}>Ce mois</TableHead>
                                    <TableHead className="text-right text-blue-600">% Cumul</TableHead>
                                </TableRow>
                                <TableRow className="text-xs text-muted-foreground">
                                    <TableHead colSpan={4} className="border-r"></TableHead>
                                    <TableHead className="text-center bg-blue-50 font-normal">%</TableHead>
                                    <TableHead className="text-center bg-blue-50 font-normal border-r">Montant</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subcontract.items?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground bg-yellow-50">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="font-semibold text-yellow-800">⚠️ Aucun élément facturable détecté</span>
                                                    <span className="text-xs text-yellow-700 max-w-md">
                                                        Ce contrat utilise l'ancien format (Tâches uniquement).
                                                        Pour utiliser la nouvelle facturation détaillée, vous devez convertir les tâches existantes en articles.
                                                    </span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-yellow-600 text-yellow-800 hover:bg-yellow-100"
                                                    onClick={async () => {
                                                        const confirm = window.confirm("Ceci va créer des articles basés sur les tâches existantes. Continuer ?")
                                                        if (!confirm) return
                                                        try {
                                                            const res = await fetch(`/api/subcontracts/${subcontractId}/migrate`, { method: 'POST' })
                                                            if (res.ok) {
                                                                window.location.reload()
                                                            } else {
                                                                alert("Erreur lors de la migration")
                                                            }
                                                        } catch (e) { console.error(e); alert("Erreur technique") }
                                                    }}
                                                >
                                                    <Calculator className="w-4 h-4 mr-2" />
                                                    Convertir les Tâches en Articles
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {subcontract.items?.map((item: any) => {
                                    const line = billingLines[item.id] || { previousPercentage: 0, currentPercentage: 0, currentAmount: 0, totalPercentage: 0 }

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium text-sm">
                                                {item.description}
                                            </TableCell>
                                            <TableCell className="text-right text-xs">
                                                {formatCurrency(item.unitPrice, "DZD")}
                                            </TableCell>
                                            <TableCell className="text-right text-xs">
                                                {item.quantity} {item.unit}
                                            </TableCell>
                                            <TableCell className="text-right border-l bg-slate-50/50">
                                                {line.previousPercentage.toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="bg-blue-50/30 p-1">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-right bg-white"
                                                    value={line.currentPercentage}
                                                    onChange={e => handleLineChange(item.id, 'percentage', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="bg-blue-50/30 p-1 border-r text-right font-mono">
                                                {formatCurrency(line.currentAmount, "DZD")}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-gray-700 bg-slate-50/50 p-1">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Input
                                                        type="number"
                                                        className="h-8 w-20 text-right bg-white font-bold"
                                                        value={line.totalPercentage}
                                                        onChange={e => handleLineChange(item.id, 'totalPercentage', e.target.value)}
                                                    />
                                                    <span>%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="bg-slate-50 flex flex-col items-end gap-2 pt-6 border-t">
                        <div className="w-full md:w-1/3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Travaux (HT)</span>
                                <span>{formatCurrency(totals.progressTotal, "DZD")}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-600">
                                <span>Retenue de Garantie ({subcontract?.retentionGuarantee}%)</span>
                                <span>- {formatCurrency(totals.retentionAmount, "DZD")}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                <span>Net à Payer</span>
                                <span>{formatCurrency(totals.total, "DZD")}</span>
                            </div>
                            <Button className="w-full mt-4" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? "Enregistrement..." : "Valider la Facture"}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
