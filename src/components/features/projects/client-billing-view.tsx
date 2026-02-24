"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { FileText, Printer } from "lucide-react"
import { InvoiceList } from "./invoice-list"

interface ClientBillingViewProps {
    projectId: string
}

export function ClientBillingView({ projectId }: ClientBillingViewProps) {
    const [market, setMarket] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMarketData()
    }, [projectId])

    const fetchMarketData = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/market`)
            if (res.ok) {
                const data = await res.json()
                setMarket(data.market)
            }
        } catch (error) {
            console.error("Failed to fetch market data:", error)
        } finally {
            setLoading(false)
        }
    }

    // Helper: Calculate Article Progress (Same logic as TaskManagementView)
    const calculateArticleProgress = (article: any) => {
        const tasks = article.tasks || []
        if (tasks.length === 0) return 0

        // Calculate weighted progress of tasks (based on subtasks)
        // We replicate the logic: Task Progress = Average of Subtasks (excluding reserves)
        // Article Progress = Average of Tasks

        const taskProgresses = tasks.map((task: any) => {
            const subtasks = task.subTasks || []
            const mainSubtasks = subtasks.filter((st: any) => !st.isReserve)

            if (mainSubtasks.length === 0) {
                if (subtasks.length > 0) return 100 // Only reserves, assume done? Or 0? Matching other view: 100
                return 0
            }

            const total = mainSubtasks.reduce((sum: number, st: any) => sum + (st.completionPercentage || 0), 0)
            return Math.round(total / mainSubtasks.length)
        })

        const totalProgress = taskProgresses.reduce((sum: number, p: number) => sum + p, 0)
        return Math.round(totalProgress / tasks.length)
    }

    const calculateLotBilling = (lot: any) => {
        let totalAmount = 0
        let realizedAmount = 0

        lot.articles?.forEach((article: any) => {
            totalAmount += article.totalAmount
            const progress = calculateArticleProgress(article)
            realizedAmount += article.totalAmount * (progress / 100)
        })

        return { totalAmount, realizedAmount }
    }

    const calculateGlobalBilling = () => {
        let total = 0
        let realized = 0
        market?.lots?.forEach((lot: any) => {
            const stats = calculateLotBilling(lot)
            total += stats.totalAmount
            realized += stats.realizedAmount
        })
        return { total, realized }
    }

    if (loading) return <p className="text-center py-8">Chargement de la facturation...</p>
    if (!market || !market.lots) return <p className="text-center py-8">Aucune donnée marché.</p>

    const globalStats = calculateGlobalBilling()
    const globalPercentage = globalStats.total > 0 ? (globalStats.realized / globalStats.total) * 100 : 0

    return (
        <div className="space-y-6">
            {/* Global Billing Summary */}
            <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-xl">Suivi de Facturation Client (Cumulatif)</CardTitle>
                        <CardDescription> basé sur l'avancement des tâches</CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-green-700">{formatCurrency(globalStats.realized, "DZD")}</div>
                        <div className="text-xs text-gray-500">sur {formatCurrency(globalStats.total, "DZD")}</div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Progress value={globalPercentage} className="h-4 w-full" />
                    <div className="text-right text-xs font-bold mt-1 text-slate-600">{globalPercentage.toFixed(2)}% Facturable</div>
                </CardContent>
            </Card>

            {/* Invoices Management */}
            <InvoiceList projectId={projectId} />

            <div className="border-t my-8"></div>
            <h3 className="text-lg font-semibold mb-4">Détails Cumulatifs en cours</h3>

            {/* Print/Export Actions */}
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Imprimer
                </Button>
            </div>

            {/* Lots and Articles Table */}
            <div className="space-y-8">
                {market.lots.map((lot: any) => {
                    const stats = calculateLotBilling(lot)
                    const lotProgress = stats.totalAmount > 0 ? (stats.realizedAmount / stats.totalAmount) * 100 : 0

                    return (
                        <div key={lot.id} className="border rounded-lg overflow-hidden bg-white shadow-sm break-inside-avoid">
                            {/* Lot Header */}
                            <div className="bg-slate-100 p-4 border-b flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">{lot.code} - {lot.name}</h3>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-600">{formatCurrency(stats.realizedAmount, "DZD")}</div>
                                    <div className="text-xs text-slate-500">Facturable ({lotProgress.toFixed(1)}%)</div>
                                </div>
                            </div>

                            {/* Articles Table */}
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="p-3 text-left font-medium w-24">Code</th>
                                        <th className="p-3 text-left font-medium">Désignation</th>
                                        <th className="p-3 text-center font-medium w-16">Unité</th>
                                        <th className="p-3 text-right font-medium w-24">Qté Marché</th>
                                        <th className="p-3 text-right font-medium w-24">P.U.</th>
                                        <th className="p-3 text-right font-medium w-16 bg-blue-50 text-blue-700">% Real.</th>
                                        <th className="p-3 text-right font-medium w-24 bg-green-50 text-green-700">Qté Fact.</th>
                                        <th className="p-3 text-right font-medium w-32 bg-green-50 text-green-700">Montant Fact.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {lot.articles?.map((article: any) => {
                                        const progress = calculateArticleProgress(article)
                                        const realizedQty = article.quantity * (progress / 100)
                                        const realizedAmount = article.totalAmount * (progress / 100)

                                        return (
                                            <tr key={article.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-medium text-slate-700">{article.code}</td>
                                                <td className="p-3">{article.designation}</td>
                                                <td className="p-3 text-center">{article.unit}</td>
                                                <td className="p-3 text-right text-slate-600">{article.quantity.toFixed(2)}</td>
                                                <td className="p-3 text-right text-slate-600">{formatCurrency(article.unitPrice, "DZD")}</td>
                                                <td className="p-3 text-right font-bold text-blue-600 bg-blue-50/30">
                                                    {progress}%
                                                </td>
                                                <td className="p-3 text-right font-bold text-green-700 bg-green-50/30">
                                                    {realizedQty.toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right font-bold text-green-700 bg-green-50/30">
                                                    {formatCurrency(realizedAmount, "DZD")}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
