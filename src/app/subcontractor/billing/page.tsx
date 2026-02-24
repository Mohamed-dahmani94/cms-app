
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function SubcontractorBillingPage() {
    const [billingData, setBillingData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchBilling()
    }, [])

    const fetchBilling = async () => {
        try {
            const res = await fetch("/api/subcontractor/billing")
            if (res.ok) {
                const data = await res.json()
                setBillingData(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div>Chargement de la facturation...</div>

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Situation & Facturation</h1>

            {billingData.map((contract) => (
                <Card key={contract.subcontractId}>
                    <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>{contract.subcontractName}</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">Montant Contrat: {contract.totalContractAmount.toLocaleString()} DZD</p>
                            </div>
                            <Button
                                onClick={async () => {
                                    if (confirm("Voulez-vous générer une demande de situation pour le montant restant?")) {
                                        const res = await fetch("/api/subcontractor/billing", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ subcontractId: contract.subcontractId })
                                        })
                                        if (res.ok) {
                                            alert("Demande envoyée avec succès!")
                                            fetchBilling()
                                        } else {
                                            const err = await res.text()
                                            alert("Erreur: " + err)
                                        }
                                    }
                                }}
                                disabled={contract.remainderToBill <= 0}
                            >
                                Demander une Situation
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                                <div className="text-sm text-blue-600 dark:text-blue-400">Travaux Réalisés</div>
                                <div className="text-xl font-bold">{contract.currentWorkAmount.toLocaleString()} DZD</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg">
                                <div className="text-sm text-green-600 dark:text-green-400">Déjà Facturé</div>
                                <div className="text-xl font-bold">{contract.totalInvoiced.toLocaleString()} DZD</div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg">
                                <div className="text-sm text-orange-600 dark:text-orange-400">Reste à Facturer</div>
                                <div className="text-xl font-bold">{contract.remainderToBill.toLocaleString()} DZD</div>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tâche</TableHead>
                                    <TableHead>Prix Unitaire/Forfait</TableHead>
                                    <TableHead>Avancement</TableHead>
                                    <TableHead className="text-right">Montant Réalisé</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contract.tasks.map((task: any) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>{task.price?.toLocaleString()} DZD</TableCell>
                                        <TableCell>
                                            <Badge variant={task.progress === 100 ? "default" : "secondary"}>
                                                {task.progress}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {((task.price || 0) * (task.progress / 100)).toLocaleString()} DZD
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}

            {billingData.length === 0 && (
                <p className="text-gray-500">Aucun contrat actif trouvé.</p>
            )}
        </div>
    )
}
