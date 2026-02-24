"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Calendar, CheckCircle2, AlertCircle, DollarSign, FileText, Briefcase } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface SubcontractDetailsViewProps {
    subcontractId: string
    onBack: () => void
}

import { SubcontractorBillingForm } from "./subcontractor-billing-form"
import { Printer } from "lucide-react"

export function SubcontractDetailsView({ subcontractId, onBack }: SubcontractDetailsViewProps) {
    const [subcontract, setSubcontract] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isBillingOpen, setIsBillingOpen] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/subcontracts/${subcontractId}`)
                if (res.ok) {
                    const data = await res.json()
                    setSubcontract(data)
                } else {
                    console.error("Failed to fetch subcontract details")
                }
            } catch (error) {
                console.error("Error fetching details:", error)
            } finally {
                setLoading(false)
            }
        }
        if (!isBillingOpen) fetchData()
    }, [subcontractId, isBillingOpen])

    if (isBillingOpen) {
        return <SubcontractorBillingForm subcontractId={subcontractId} onCancel={() => setIsBillingOpen(false)} onSuccess={() => setIsBillingOpen(false)} />
    }

    if (loading) return <div className="p-8 text-center">Chargement des détails...</div>
    if (!subcontract) return <div className="p-8 text-center text-red-500">Erreur : Contrat introuvable</div>

    // Calculations
    const totalAmount = subcontract.totalAmount || 0
    const bills = subcontract.bills || []
    const paidBills = bills.filter((b: any) => b.status === "PAID")
    const paidAmount = paidBills.reduce((acc: number, b: any) => acc + (b.totalAmount || 0), 0)
    const remainingAmount = totalAmount - paidAmount
    const progressPercent = paidAmount > 0 && totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0 // Financial progress
    // Or task progress?
    const tasks = subcontract.tasks || []
    const completedTasks = tasks.filter((t: any) => t.status === "FINAL_DONE").length
    const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "ACTIVE": return "default"
            case "COMPLETED": return "success" // Assuming we have success variant or default to something
            case "DRAFT": return "secondary"
            default: return "outline"
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Non défini"
        return new Date(dateString).toLocaleDateString('fr-FR')
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0">
            {/* Header */}
            <div className="flex items-center gap-4 print:hidden">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {subcontract.name}
                        <Badge variant={getStatusVariant(subcontract.status) as any}>{subcontract.status}</Badge>
                    </h2>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <UserIcon className="w-4 h-4" />
                        {subcontract.subcontractor?.name}
                    </p>
                </div>
            </div>

            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block mb-8">
                <h1 className="text-3xl font-bold mb-2">{subcontract.name}</h1>
                <div className="text-xl text-gray-600">Sous-traitant: {subcontract.subcontractor?.name}</div>
                <div className="text-sm text-gray-500 mt-1">Imprimé le {new Date().toLocaleDateString('fr-FR')}</div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avancement Tâches</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{taskProgress}%</div>
                        <Progress value={taskProgress} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">{completedTasks} / {tasks.length} tâches terminées</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Montant Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalAmount, subcontract.project?.currencyUnit || "DZD")}</div>
                        <p className="text-xs text-muted-foreground mt-1">Budget alloué</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Payé à ce jour</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount, subcontract.project?.currencyUnit || "DZD")}</div>
                        <p className="text-xs text-muted-foreground mt-1">{paidBills.length} factures réglées</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Reste à Payer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(remainingAmount, subcontract.project?.currencyUnit || "DZD")}</div>
                        <p className="text-xs text-muted-foreground mt-1">En attente ou à facturer</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="tasks" className="w-full print:hidden">
                <TabsList>
                    <TabsTrigger value="tasks">Tâches ({tasks.length})</TabsTrigger>
                    <TabsTrigger value="billing">Facturation ({bills.length})</TabsTrigger>
                    <TabsTrigger value="info">Informations</TabsTrigger>
                </TabsList>

                {/* TASKS TAB */}
                <TabsContent value="tasks" className="space-y-4 pt-4">
                    <div className="flex justify-end mb-2">
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimer la liste
                        </Button>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Liste des Tâches Assignées</CardTitle>
                            <CardDescription>Suivi de l'exécution sur chantier</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Titre</TableHead>
                                        <TableHead>Date d'échéance</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Progression</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.map((task: any) => (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium">{task.title}</TableCell>
                                            <TableCell>{formatDate(task.dueDate)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{task.status}</Badge>
                                            </TableCell>
                                            <TableCell className="w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={task.progress} className="h-2 w-full" />
                                                    <span className="text-xs font-mono">{task.progress}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {tasks.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Aucune tâche assignée pour le moment.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* BILLING TAB */}
                <TabsContent value="billing" className="space-y-4 pt-4">
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => setIsBillingOpen(true)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Saisir une nouvelle facture
                        </Button>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Historique des Factures & Situations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>N° Facture</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Montant HT</TableHead>
                                        <TableHead>Montant Total</TableHead>
                                        <TableHead>Statut</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bills.map((bill: any) => (
                                        <TableRow key={bill.id}>
                                            <TableCell className="font-mono">{bill.number}</TableCell>
                                            <TableCell>{formatDate(bill.date)}</TableCell>
                                            <TableCell>{formatCurrency(bill.progressAmount, "DZD")}</TableCell>
                                            <TableCell className="font-bold">{formatCurrency(bill.totalAmount, "DZD")}</TableCell>
                                            <TableCell>
                                                <Badge className={bill.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                                    {bill.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {bills.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                Aucune facture enregistrée.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* INFO TAB */}
                <TabsContent value="info" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Détails du Contrat</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500">Date de début</h4>
                                    <p>{formatDate(subcontract.startDate)}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500">Date de fin prévue</h4>
                                    <p>{formatDate(subcontract.endDate)}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500">Retenue de Garantie</h4>
                                    <p>{subcontract.retentionGuarantee}%</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500">Email Sous-traitant</h4>
                                    <p>{subcontract.subcontractor?.email}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Print View for Tasks (Visible only in print) */}
            <div className="hidden print:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Titre</TableHead>
                            <TableHead>Date d'échéance</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Progression</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.map((task: any) => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.title}</TableCell>
                                <TableCell>{formatDate(task.dueDate)}</TableCell>
                                <TableCell>{task.status}</TableCell>
                                <TableCell>{task.progress}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function UserIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
