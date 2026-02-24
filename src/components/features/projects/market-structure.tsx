import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ChevronDown, ChevronRight, FileText, CheckCircle, AlertCircle, Plus } from "lucide-react"
import { formatCurrency, formatCompactCurrency } from "@/lib/currency"

interface MarketStructureProps {
    projectId: string
}

export function MarketStructure({ projectId }: MarketStructureProps) {
    const [market, setMarket] = useState<any>(null)
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set())
    const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())

    // New Amendment State
    const [isNewAmendmentOpen, setIsNewAmendmentOpen] = useState(false)
    const [newAmendmentNumber, setNewAmendmentNumber] = useState("")

    // Article Creation State
    const [isNewArticleOpen, setIsNewArticleOpen] = useState(false)
    const [selectedAmendmentId, setSelectedAmendmentId] = useState<string | null>(null)
    const [newArticle, setNewArticle] = useState({
        lotId: "",
        code: "",
        designation: "",
        unit: "U",
        quantity: 0,
        unitPrice: 0
    })

    const handleCreateArticle = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/market/articles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...newArticle,
                    amendmentId: selectedAmendmentId
                })
            })

            if (res.ok) {
                setIsNewArticleOpen(false)
                setNewArticle({ lotId: "", code: "", designation: "", unit: "U", quantity: 0, unitPrice: 0 })
                fetchMarketData()
            }
        } catch (error) {
            console.error("Failed to create article", error)
        }
    }

    const openNewArticleDialog = (amendmentId: string) => {
        setSelectedAmendmentId(amendmentId)
        setIsNewArticleOpen(true)
    }

    useEffect(() => {
        fetchMarketData()
    }, [projectId])

    const fetchMarketData = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/market`)
            if (res.ok) {
                const data = await res.json()
                setMarket(data.market)
                setSummary(data.summary)
            }
        } catch (error) {
            console.error("Failed to fetch market data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateAmendment = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/market/amendments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    number: newAmendmentNumber,
                    date: new Date().toISOString()
                })
            })

            if (res.ok) {
                setIsNewAmendmentOpen(false)
                setNewAmendmentNumber("")
                fetchMarketData()
            }
        } catch (error) {
            console.error("Failed to create amendment", error)
        }
    }

    const toggleLot = (lotId: string) => {
        const newExpanded = new Set(expandedLots)
        if (newExpanded.has(lotId)) {
            newExpanded.delete(lotId)
        } else {
            newExpanded.add(lotId)
        }
        setExpandedLots(newExpanded)
    }

    const toggleArticle = (articleId: string) => {
        const newExpanded = new Set(expandedArticles)
        if (newExpanded.has(articleId)) {
            newExpanded.delete(articleId)
        } else {
            newExpanded.add(articleId)
        }
        setExpandedArticles(newExpanded)
    }

    if (loading) {
        return <div className="p-4">Chargement de la structure du marché...</div>
    }

    if (!market) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Structure du Marché</CardTitle>
                    <CardDescription>Aucun marché configuré pour ce projet</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    // Filter articles for Base Market view (no amendmentId)
    const getBaseMarketLots = () => {
        return market.lots?.map((lot: any) => ({
            ...lot,
            articles: lot.articles?.filter((a: any) => !a.amendmentId)
        })).filter((lot: any) => lot.articles?.length > 0)
    }

    return (
        <div className="space-y-4">
            {/* Market Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Marché N° {market.marketNumber}</CardTitle>
                    <CardDescription>
                        ODS N° {market.odsNumber || "N/A"} - {new Date(market.marketDate).toLocaleDateString('fr-FR')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Actuel</p>
                            <p className="text-2xl font-bold text-primary">{formatCompactCurrency(summary?.estimatedCost || 0, "DZD")}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Marché Base</p>
                            <p className="text-xl font-semibold text-gray-700">{formatCompactCurrency(summary?.baseCost || 0, "DZD")}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Avenants</p>
                            <p className="text-xl font-semibold text-amber-600">{formatCompactCurrency(summary?.amendmentCost || 0, "DZD")}</p>
                        </div>
                        <div className="flex flex-col justify-center">
                            <Dialog open={isNewAmendmentOpen} onOpenChange={setIsNewAmendmentOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="w-full gap-2">
                                        <Plus className="h-4 w-4" />
                                        Nouvel Avenant
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Créer un Avenant</DialogTitle>
                                        <DialogDescription>
                                            Ajoutez un avenant pour gérer les travaux supplémentaires ou modifications.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Numéro / Référence</Label>
                                            <Input
                                                placeholder="Ex: Avenant N°1"
                                                value={newAmendmentNumber}
                                                onChange={(e) => setNewAmendmentNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateAmendment}>Créer</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Article Creation Dialog */}
            <Dialog open={isNewArticleOpen} onOpenChange={setIsNewArticleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter Article à l'Avenant</DialogTitle>
                        <DialogDescription>
                            Ajoutez un nouvel article travaux supplémentaires.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Lot de rattachement</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={newArticle.lotId}
                                onChange={(e) => setNewArticle({ ...newArticle, lotId: e.target.value })}
                            >
                                <option value="">Sélectionner un Lot</option>
                                {market?.lots?.map((lot: any) => (
                                    <option key={lot.id} value={lot.id}>{lot.code} - {lot.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Code Article</Label>
                                <Input
                                    value={newArticle.code}
                                    onChange={(e) => setNewArticle({ ...newArticle, code: e.target.value })}
                                    placeholder="Ex: 1.1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unité</Label>
                                <Input
                                    value={newArticle.unit}
                                    onChange={(e) => setNewArticle({ ...newArticle, unit: e.target.value })}
                                    placeholder="Ex: U, m2, m3"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Désignation</Label>
                            <Input
                                value={newArticle.designation}
                                onChange={(e) => setNewArticle({ ...newArticle, designation: e.target.value })}
                                placeholder="Description de l'article"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantité</Label>
                                <Input
                                    type="number"
                                    value={newArticle.quantity}
                                    onChange={(e) => setNewArticle({ ...newArticle, quantity: e.target.value ? parseFloat(e.target.value) : 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Prix Unitaire</Label>
                                <Input
                                    type="number"
                                    value={newArticle.unitPrice}
                                    onChange={(e) => setNewArticle({ ...newArticle, unitPrice: e.target.value ? parseFloat(e.target.value) : 0 })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateArticle}>Ajouter l'Article</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="base" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="base">Marché Initial</TabsTrigger>
                    <TabsTrigger value="amendments">Avenants ({market.amendments?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="base" className="space-y-4 mt-4">
                    {/* Base Market Categories/Lots */}
                    {getBaseMarketLots().map((lot: any) => (
                        <LotCard
                            key={lot.id}
                            lot={lot}
                            expandedLots={expandedLots}
                            toggleLot={toggleLot}
                            expandedArticles={expandedArticles}
                            toggleArticle={toggleArticle}
                        />
                    ))}
                </TabsContent>

                <TabsContent value="amendments" className="space-y-4 mt-4">
                    {market.amendments?.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground border rounded-lg bg-slate-50">
                            Aucun avenant créé pour le moment.
                        </div>
                    )}
                    {market.amendments?.map((amendment: any) => (
                        <Card key={amendment.id} className="border-amber-200 bg-amber-50/30">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>{amendment.number}</CardTitle>
                                        <CardDescription>{new Date(amendment.date).toLocaleDateString('fr-FR')}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                            {amendment.articles?.length || 0} articles
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={() => openNewArticleDialog(amendment.id)}>
                                            <Plus className="h-4 w-4 mr-1" /> Article
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Group amendment articles by LOT for display consistency?? 
                                    Or just list them flat? Usually amendments are specific. 
                                    For now, straightforward list or simple breakdown. 
                                    Actually, articles still belong to LOTS. 
                                */}
                                <div className="space-y-2">
                                    {/* Simplification: Just list the articles in this amendment */}
                                    {amendment.articles?.map((article: any) => (
                                        <div key={article.id} className="border bg-white rounded-lg p-3 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-amber-600" />
                                                <span className="font-medium">{article.code} - {article.designation}</span>
                                            </div>
                                            <span className="font-bold">{formatCurrency(article.totalAmount, "DZD")}</span>
                                        </div>
                                    ))}
                                    {(!amendment.articles || amendment.articles.length === 0) && (
                                        <p className="text-sm text-gray-500 italic">Aucun article lié à cet avenant.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    )
}

// Helper Component for Lot Rendering to reduce duplication
function LotCard({ lot, expandedLots, toggleLot, expandedArticles, toggleArticle }: any) {
    return (
        <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleLot(lot.id)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {expandedLots.has(lot.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <CardTitle className="text-lg">{lot.code} - {lot.name}</CardTitle>
                        <Badge variant="secondary">{lot.articles?.length || 0} articles</Badge>
                    </div>
                </div>
            </CardHeader>

            {expandedLots.has(lot.id) && (
                <CardContent className="space-y-2">
                    {lot.articles?.map((article: any) => (
                        <div key={article.id} className="border rounded-lg p-3">
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleArticle(article.id)}
                            >
                                <div className="flex items-center gap-2">
                                    {expandedArticles.has(article.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <FileText className="h-4 w-4" />
                                    <span className="font-medium">{article.code} - {article.designation}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {article.pvRequired && (
                                        <Badge variant="outline" className="gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            PV Requis
                                        </Badge>
                                    )}
                                    <Badge variant="secondary">
                                        {article.quantity} {article.unit}
                                    </Badge>
                                    <span className="font-bold">{formatCurrency(article.totalAmount, "DZD")}</span>
                                </div>
                            </div>

                            {expandedArticles.has(article.id) && (
                                <div className="mt-3 ml-6 space-y-2">
                                    <div className="text-sm text-muted-foreground">
                                        Prix unitaire: {formatCurrency(article.unitPrice, "DZD")} / {article.unit}
                                    </div>

                                    {article.tasks?.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">Tâches ({article.tasks.length}):</p>
                                            {article.tasks.map((task: any) => (
                                                <div key={task.id} className="ml-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{task.code}</span>
                                                        <span>{task.designation}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {task.subTasks?.length || 0} sous-tâches
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            )}
        </Card>
    )
}
