
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, Clock, TrendingUp } from "lucide-react"

export default function SubcontractorDashboard() {
    const [stats, setStats] = useState<any>(null)

    useEffect(() => {
        fetchBillingStatus()
    }, [])

    const fetchBillingStatus = async () => {
        // Reuse billing endpoint to get stats
        const res = await fetch("/api/subcontractor/billing")
        if (res.ok) {
            const data = await res.json()
            // Aggregate stats from all subcontracts
            const totalContract = data.reduce((acc: any, curr: any) => acc + curr.totalContractAmount, 0)
            const totalInvoiced = data.reduce((acc: any, curr: any) => acc + curr.totalInvoiced, 0)
            const pendingBill = data.reduce((acc: any, curr: any) => acc + curr.remainderToBill, 0)

            setStats({ totalContract, totalInvoiced, pendingBill })
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vue d'ensemble</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Montant Contrats</CardTitle>
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalContract?.toLocaleString()} DZD</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Facturé (Validé)</CardTitle>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats?.totalInvoiced?.toLocaleString()} DZD</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Reste à Facturer</CardTitle>
                        <Clock className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats?.pendingBill?.toLocaleString()} DZD</div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Activités Récentes</h2>
                <Card>
                    <CardContent className="py-6 text-center text-gray-500">
                        Aucune activité récente pour le moment.
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
