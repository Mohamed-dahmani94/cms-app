"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Package, Trash2, X } from "lucide-react"

const MOVEMENT_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  ENTRY: { label: "Entrée", color: "text-green-600 bg-green-50", icon: "📥" },
  EXIT: { label: "Sortie", color: "text-red-600 bg-red-50", icon: "📤" },
  CONSUMPTION: { label: "Consommation", color: "text-orange-600 bg-orange-50", icon: "🔧" },
  SALE: { label: "Vente", color: "text-blue-600 bg-blue-50", icon: "💰" },
  RETURN: { label: "Retour", color: "text-purple-600 bg-purple-50", icon: "↩️" },
  ADJUSTMENT: { label: "Ajustement", color: "text-gray-600 bg-gray-50", icon: "⚙️" },
}

interface LineItem {
  productId: string
  quantity: string
  unitPrice: string
}

export default function MovementsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [filterType, setFilterType] = useState("")
  const [filterProduct, setFilterProduct] = useState("")
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Multi-product form state
  const [formType, setFormType] = useState("ENTRY")
  const [formSupplierId, setFormSupplierId] = useState("")
  const [formProjectId, setFormProjectId] = useState("")
  const [formReason, setFormReason] = useState("")
  const [formReference, setFormReference] = useState("")
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", quantity: "", unitPrice: "" }])

  useEffect(() => { if (authStatus === "unauthenticated") router.push("/login") }, [authStatus])

  useEffect(() => {
    fetchMovements()
    fetch("/api/products").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/suppliers").then(r => r.json()).then(d => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {})
  }, [filterType, filterProduct])

  async function fetchMovements() {
    try {
      const params = new URLSearchParams()
      if (filterType) params.set("type", filterType)
      if (filterProduct) params.set("productId", filterProduct)
      params.set("limit", "100")
      const res = await fetch(`/api/stock-movements?${params}`)
      const data = await res.json()
      setMovements(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function openCreate(type: string = "ENTRY") {
    setFormType(type)
    setFormSupplierId("")
    setFormProjectId("")
    setFormReason("")
    setFormReference("")
    setLines([{ productId: "", quantity: "", unitPrice: "" }])
    setShowCreate(true)
  }

  function addLine() {
    setLines([...lines, { productId: "", quantity: "", unitPrice: "" }])
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  function updateLine(index: number, field: keyof LineItem, value: string) {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-fill price from product when selecting a product
    if (field === "productId" && value) {
      const prod = products.find((p: any) => p.id === value)
      if (prod) {
        updated[index].unitPrice = String(prod.unitPrice)
      }
    }
    setLines(updated)
  }

  // Filter out already-selected products
  function availableProducts(currentLineIndex: number) {
    const selectedIds = lines.map((l, i) => i === currentLineIndex ? "" : l.productId).filter(Boolean)
    return products.filter((p: any) => !selectedIds.includes(p.id))
  }

  // Calculate totals
  function lineTotal(line: LineItem) {
    const qty = parseFloat(line.quantity) || 0
    const price = parseFloat(line.unitPrice) || 0
    return qty * price
  }

  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)

  async function handleCreate() {
    // Validate: at least one line with productId + quantity
    const validLines = lines.filter(l => l.productId && l.quantity && parseFloat(l.quantity) > 0)
    if (validLines.length === 0) {
      alert("Ajoutez au moins un produit avec une quantité")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        type: formType,
        supplierId: formSupplierId || undefined,
        projectId: formProjectId || undefined,
        reason: formReason || undefined,
        reference: formReference || undefined,
        userId: (session?.user as any)?.id,
        items: validLines.map(l => ({
          productId: l.productId,
          quantity: parseFloat(l.quantity),
          unitPrice: l.unitPrice ? parseFloat(l.unitPrice) : undefined,
        }))
      }

      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Erreur lors de la création")
        setSubmitting(false)
        return
      }

      setShowCreate(false)
      fetchMovements()
      // Refresh products to get updated stock levels
      fetch("/api/products").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
    } catch (e) {
      console.error(e)
      alert("Erreur réseau")
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory"><ArrowLeft className="h-4 w-4 mr-2" />Inventaire</Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔄 Mouvements de Stock</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="text-green-600 border-green-300" onClick={() => openCreate("ENTRY")}>
              <TrendingUp className="h-4 w-4 mr-1" />Entrée
            </Button>
            <Button variant="outline" className="text-red-600 border-red-300" onClick={() => openCreate("EXIT")}>
              <TrendingDown className="h-4 w-4 mr-1" />Sortie
            </Button>
            <Button variant="outline" className="text-orange-600 border-orange-300" onClick={() => openCreate("CONSUMPTION")}>
              <Package className="h-4 w-4 mr-1" />Consommation
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button variant={filterType === "" ? "default" : "outline"} size="sm" onClick={() => setFilterType("")}>Tous</Button>
          {Object.entries(MOVEMENT_TYPES).map(([key, { label, icon }]) => (
            <Button key={key} variant={filterType === key ? "default" : "outline"} size="sm" onClick={() => setFilterType(key)}>
              {icon} {label}
            </Button>
          ))}
          <select className="ml-auto border rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-800" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
            <option value="">Tous les produits</option>
            {products.map((p: any) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-center py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Produit</th>
                    <th className="text-left py-3 px-4">Fournisseur</th>
                    <th className="text-right py-3 px-4">Quantité</th>
                    <th className="text-right py-3 px-4">P.U.</th>
                    <th className="text-right py-3 px-4">Montant</th>
                    <th className="text-left py-3 px-4">Motif</th>
                    <th className="text-left py-3 px-4">Réf.</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => {
                    const mt = MOVEMENT_TYPES[m.type] || { label: m.type, color: "text-gray-600", icon: "📋" }
                    const isEntry = m.type === "ENTRY" || m.type === "RETURN"
                    return (
                      <tr key={m.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">{new Date(m.date).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${mt.color}`}>{mt.icon} {mt.label}</span>
                        </td>
                        <td className="py-3 px-4">{m.product?.name || "—"}</td>
                        <td className="py-3 px-4 text-xs">{m.supplier?.name || "—"}</td>
                        <td className={`py-3 px-4 text-right font-bold ${isEntry ? "text-green-600" : "text-red-600"}`}>
                          {isEntry ? "+" : "-"}{m.quantity} {m.product?.unit}
                        </td>
                        <td className="py-3 px-4 text-right">{m.unitPrice?.toLocaleString("fr-DZ")} DA</td>
                        <td className="py-3 px-4 text-right font-bold">{m.total?.toLocaleString("fr-DZ")} DA</td>
                        <td className="py-3 px-4 text-xs text-gray-500">{m.reason || "—"}</td>
                        <td className="py-3 px-4 text-xs text-gray-500">{m.reference || m.batchRef || "—"}</td>
                      </tr>
                    )
                  })}
                  {movements.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-500">Aucun mouvement</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Multi-Product Movement Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {MOVEMENT_TYPES[formType]?.icon} Nouveau Mouvement — {MOVEMENT_TYPES[formType]?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Type + Supplier + Reference in one row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Type *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={formType} onChange={(e) => setFormType(e.target.value)}>
                  {Object.entries(MOVEMENT_TYPES).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>{icon} {label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Fournisseur</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={formSupplierId} onChange={(e) => setFormSupplierId(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>N° Réf. / BL</Label>
                <Input value={formReference} onChange={(e) => setFormReference(e.target.value)} placeholder="BL-2025-001" />
              </div>
            </div>

            {/* Project (for exits/consumption) */}
            {(formType === "CONSUMPTION" || formType === "EXIT" || formType === "SALE") && (
              <div>
                <Label>Projet</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {/* Lines Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-base font-semibold">Produits</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-3 w-3 mr-1" />Ajouter un produit
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="text-left py-2 px-3 w-[40%]">Produit *</th>
                      <th className="text-right py-2 px-3 w-[15%]">Quantité *</th>
                      <th className="text-right py-2 px-3 w-[18%]">Prix Unit. (DA)</th>
                      <th className="text-right py-2 px-3 w-[18%]">Montant</th>
                      <th className="text-center py-2 px-3 w-[9%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => {
                      const tot = lineTotal(line)
                      return (
                        <tr key={i} className="border-t">
                          <td className="py-2 px-3">
                            <select
                              className="w-full border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
                              value={line.productId}
                              onChange={(e) => updateLine(i, "productId", e.target.value)}
                            >
                              <option value="">— Sélectionner —</option>
                              {availableProducts(i).map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} — {p.name} ({p.currentStock} {p.unit})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="text-right"
                              value={line.quantity}
                              onChange={(e) => updateLine(i, "quantity", e.target.value)}
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="text-right"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-sm">
                            {tot > 0 ? `${tot.toLocaleString("fr-DZ")} DA` : "—"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {lines.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" className="text-red-500 p-1 h-auto" onClick={() => removeLine(i)}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-right font-semibold text-sm">{lines.filter(l => l.productId).length} produit(s)</td>
                      <td className="py-2 px-3 text-right font-semibold text-sm">Total :</td>
                      <td className="py-2 px-3 text-right font-bold text-base text-blue-700 dark:text-blue-400">
                        {grandTotal.toLocaleString("fr-DZ")} DA
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Reason */}
            <div>
              <Label>Motif / Observation</Label>
              <Input value={formReason} onChange={(e) => setFormReason(e.target.value)} placeholder="Raison du mouvement" />
            </div>

            {/* Submit */}
            <Button className="w-full" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Enregistrement..." : `Enregistrer ${lines.filter(l => l.productId && l.quantity).length} mouvement(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
