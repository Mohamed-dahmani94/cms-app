"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon, ArrowLeft, ArrowRight, Plus, Check, Search, Trash2, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"

interface SubcontractWizardProps {
    projectId: string
    onCancel: () => void
    onSuccess: () => void
}

export function SubcontractWizard({ projectId, onCancel, onSuccess }: SubcontractWizardProps) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [marketLoading, setMarketLoading] = useState(false)

    // Data Sources
    const [users, setUsers] = useState<any[]>([]) // Subcontractors
    const [market, setMarket] = useState<any>(null)

    // Form State
    const [name, setName] = useState("")
    const [subcontractorId, setSubcontractorId] = useState("")
    const [startDate, setStartDate] = useState<Date | undefined>()
    const [endDate, setEndDate] = useState<Date | undefined>()
    const [retentionGuarantee, setRetentionGuarantee] = useState("10")

    // Selection State
    const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set())

    // Configuration State
    // articleId -> { unitPrice, quantity, description, unit }
    const [itemConfigs, setItemConfigs] = useState<Record<string, any>>({})

    // Custom Items
    const [customItems, setCustomItems] = useState<any[]>([])

    // Load Initial Data
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                // Fetch Users (Subcontractors)
                const resUsers = await fetch('/api/users?role=SUBCONTRACTOR')
                if (resUsers.ok) setUsers(await resUsers.json())

                // Fetch Market
                setMarketLoading(true)
                const resMarket = await fetch(`/api/projects/${projectId}/market`)
                if (resMarket.ok) {
                    const data = await resMarket.json()
                    setMarket(data.market)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setMarketLoading(false)
            }
        }
        fetchInitial()
    }, [projectId])

    // Helper: Initial Config for selected item
    const initializeConfig = (article: any) => {
        if (!itemConfigs[article.id]) {
            setItemConfigs(prev => ({
                ...prev,
                [article.id]: {
                    description: article.designation,
                    unit: article.unit,
                    unitPrice: article.unitPrice, // Default to market price
                    quantity: article.quantity,   // Default to full quantity
                    marketPrice: article.unitPrice,
                    marketQuantity: article.quantity
                }
            }))
        }
    }

    const toggleArticleSelection = (article: any) => {
        const newSet = new Set(selectedArticleIds)
        if (newSet.has(article.id)) {
            newSet.delete(article.id)
            // Cleanup config? Maybe keep it in case re-selected
        } else {
            newSet.add(article.id)
            initializeConfig(article)
        }
        setSelectedArticleIds(newSet)
    }

    const handleConfigChange = (id: string, field: string, value: any) => {
        setItemConfigs(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }))
    }

    const addCustomItem = () => {
        const id = `custom-${Date.now()}`
        const newItem = {
            id,
            description: "Nouvel article supplémentaire",
            unit: "U",
            unitPrice: 0,
            quantity: 1,
            isCustom: true
        }
        setCustomItems([...customItems, newItem])
    }

    const removeCustomItem = (id: string) => {
        setCustomItems(customItems.filter(i => i.id !== id))
    }

    const updateCustomItem = (id: string, field: string, value: any) => {
        setCustomItems(customItems.map(i => i.id === id ? { ...i, [field]: value } : i))
    }

    // Submission
    const handleSubmit = async () => {
        setLoading(true)
        try {
            // Build items payload
            const itemsPayload = [
                // Market Items
                ...Array.from(selectedArticleIds).map(id => {
                    const config = itemConfigs[id]
                    return {
                        marketArticleId: id,
                        description: config.description,
                        unit: config.unit,
                        unitPrice: parseFloat(config.unitPrice),
                        quantity: parseFloat(config.quantity),
                        isCustom: false
                    }
                }),
                // Custom Items
                ...customItems.map(item => ({
                    description: item.description,
                    unit: item.unit,
                    unitPrice: parseFloat(item.unitPrice),
                    quantity: parseFloat(item.quantity),
                    isCustom: true
                }))
            ]

            const payload = {
                projectId,
                name,
                subcontractorId,
                startDate,
                endDate,
                retentionGuarantee,
                items: itemsPayload
            }

            const res = await fetch('/api/subcontracts/create-wizard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                onSuccess()
            } else {
                console.error("Failed to create subcontract")
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold">Nouveau Contrat de Sous-traitance</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className={cn(step >= 1 && "text-primary font-medium")}>1. Infos</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className={cn(step >= 2 && "text-primary font-medium")}>2. Sélection</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className={cn(step >= 3 && "text-primary font-medium")}>3. Configuration</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className={cn(step >= 4 && "text-primary font-medium")}>4. Validation</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Steps Content */}
            <div className="flex-1 overflow-y-auto min-h-[400px]">
                {/* STEP 1: Basic Info */}
                {step === 1 && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations Générales</CardTitle>
                                <CardDescription>Définissez les détails du contrat</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Intitulé du Contrat</Label>
                                    <Input
                                        placeholder="Ex: Lot Electricité Bloc A"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sous-traitant</Label>
                                    <Select value={subcontractorId} onValueChange={setSubcontractorId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un partenaire..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                            {/* Quick Add logic could go here later */}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Date de début</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Choisir...</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={fr} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date de fin (Estimée)</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {endDate ? format(endDate, "dd/MM/yyyy") : <span>Choisir...</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={fr} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Retenue de Garantie (%)</Label>
                                    <Input
                                        type="number"
                                        value={retentionGuarantee}
                                        onChange={e => setRetentionGuarantee(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 2: Selection */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Sélectionnez les lots et articles du marché</h3>
                            <Badge variant="secondary">{selectedArticleIds.size} articles sélectionnés</Badge>
                        </div>

                        {marketLoading ? (
                            <div className="text-center py-10">Chargement du marché...</div>
                        ) : !market ? (
                            <div className="text-center py-10 text-red-500">Marché introuvable pour ce projet.</div>
                        ) : (
                            <ScrollArea className="h-[500px] border rounded-md p-4">
                                <div className="space-y-6">
                                    {market.lots?.map((lot: any) => (
                                        <div key={lot.id} className="space-y-2">
                                            <div className="font-bold bg-slate-100 p-2 rounded-md sticky top-0 z-10">
                                                {lot.code} - {lot.name}
                                            </div>
                                            <div className="pl-4 space-y-1">
                                                {lot.articles?.map((article: any) => (
                                                    <div key={article.id} className="flex items-center space-x-2 py-1 hover:bg-slate-50 rounded px-2">
                                                        <Checkbox
                                                            id={article.id}
                                                            checked={selectedArticleIds.has(article.id)}
                                                            onCheckedChange={() => toggleArticleSelection(article)}
                                                        />
                                                        <div className="grid grid-cols-12 gap-4 flex-1 text-sm">
                                                            <div className="col-span-2 font-mono text-xs">{article.code}</div>
                                                            <div className="col-span-6">{article.designation}</div>
                                                            <div className="col-span-1 text-right text-muted-foreground">{article.unit}</div>
                                                            <div className="col-span-3 text-right text-muted-foreground">
                                                                {article.quantity} <span className="text-xs">x</span> {formatCurrency(article.unitPrice, "DZD")}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                )}

                {/* STEP 3: Configuration */}
                {step === 3 && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Configuration des Prix & Quantités</CardTitle>
                                    <CardDescription>Ajustez les prix sous-traitants (par défaut prix du marché)</CardDescription>
                                </div>
                                <Button size="sm" onClick={addCustomItem} variant="secondary">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter Article Hors-Marché
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">Désignation</TableHead>
                                            <TableHead className="w-[10%]">Unité</TableHead>
                                            <TableHead className="w-[15%] text-right">P.U Marché</TableHead>
                                            <TableHead className="w-[15%] text-right bg-blue-50">P.U Sous-traitant</TableHead>
                                            <TableHead className="w-[15%] text-right bg-blue-50">Qté à Faire</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Array.from(selectedArticleIds).map(id => {
                                            const config = itemConfigs[id]
                                            return (
                                                <TableRow key={id}>
                                                    <TableCell className="font-medium text-xs">{config.description}</TableCell>
                                                    <TableCell>{config.unit}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {formatCurrency(config.marketPrice, "DZD")}
                                                    </TableCell>
                                                    <TableCell className="bg-blue-50/50">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-right"
                                                            value={config.unitPrice}
                                                            onChange={e => handleConfigChange(id, 'unitPrice', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="bg-blue-50/50">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-right"
                                                            value={config.quantity}
                                                            onChange={e => handleConfigChange(id, 'quantity', e.target.value)}
                                                        />
                                                        <div className="text-[10px] text-muted-foreground text-right mt-1">
                                                            Max: {config.marketQuantity}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => toggleArticleSelection({ id })}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}

                                        {/* Custom Items */}
                                        {customItems.map((item) => (
                                            <TableRow key={item.id} className="bg-yellow-50/50 border-l-4 border-yellow-400">
                                                <TableCell>
                                                    <Input
                                                        value={item.description}
                                                        onChange={e => updateCustomItem(item.id, 'description', e.target.value)}
                                                        className="h-8"
                                                        placeholder="Désignation..."
                                                    />
                                                    <div className="flex items-center text-[10px] text-yellow-600 mt-1">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Sera ajouté comme Avenant
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.unit}
                                                        onChange={e => updateCustomItem(item.id, 'unit', e.target.value)}
                                                        className="h-8 w-16"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">-</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-right"
                                                        value={item.unitPrice}
                                                        onChange={e => updateCustomItem(item.id, 'unitPrice', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-right"
                                                        value={item.quantity}
                                                        onChange={e => updateCustomItem(item.id, 'quantity', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeCustomItem(item.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {selectedArticleIds.size === 0 && customItems.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    Aucun article sélectionné. Retournez à l'étape précédente ou ajoutez un article manuel.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 4: Review */}
                {step === 4 && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Récapitulatif</CardTitle>
                                <CardDescription>Vérifiez les informations avant validation</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><strong>Contrat:</strong> {name}</div>
                                    <div><strong>Sous-traitant:</strong> {users.find(u => u.id === subcontractorId)?.name}</div>
                                    <div><strong>Période:</strong> {startDate ? format(startDate, 'dd/MM/yyyy') : '?'} - {endDate ? format(endDate, 'dd/MM/yyyy') : '?'}</div>
                                    <div><strong>Retenue:</strong> {retentionGuarantee}%</div>
                                </div>
                                <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-2">Articles ({selectedArticleIds.size + customItems.length})</h4>
                                    <div className="text-2xl font-bold text-right">
                                        Total: {formatCurrency(
                                            [...Array.from(selectedArticleIds).map(id => itemConfigs[id]), ...customItems].reduce((acc, i) => acc + (parseFloat(i.unitPrice || 0) * parseFloat(i.quantity || 0)), 0),
                                            "DZD"
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Footer / Actions */}
            <div className="flex justify-between border-t pt-4 mt-4">
                <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onCancel()}>
                    {step === 1 ? "Annuler" : "Précédent"}
                </Button>
                <div className="flex gap-2">
                    {step < 4 && (
                        <Button onClick={() => setStep(step + 1)} disabled={step === 1 && (!name || !subcontractorId)}>
                            Suivant
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                    {step === 4 && (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? "Création..." : "Confirmer et Créer"}
                            <Check className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
