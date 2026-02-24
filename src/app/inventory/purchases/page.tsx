"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, ShoppingCart, Trash2, Check, Package, Eye } from "lucide-react"

interface PurchaseItem { id?: string; productId: string; productName?: string; quantity: number; unitPrice: number; total: number; received: number }
interface PurchaseOrder {
  id: string; number: string; date: string; status: string; totalAmount: number; notes?: string
  supplier: { id: string; name: string }; projectId?: string
  items: (PurchaseItem & { product: { name: string; unit: string } })[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-200 text-gray-800" },
  ORDERED: { label: "Commandé", color: "bg-blue-200 text-blue-800" },
  PARTIALLY_RECEIVED: { label: "Partiel", color: "bg-yellow-200 text-yellow-800" },
  RECEIVED: { label: "Reçu", color: "bg-green-200 text-green-800" },
  CANCELLED: { label: "Annulé", color: "bg-red-200 text-red-800" },
}

export default function PurchasesPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState<PurchaseOrder | null>(null)
  const [showReceive, setShowReceive] = useState<PurchaseOrder | null>(null)
  const [form, setForm] = useState({ number: "", supplierId: "", projectId: "", notes: "" })
  const [formItems, setFormItems] = useState<PurchaseItem[]>([])
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({})

  useEffect(() => { if (authStatus === "unauthenticated") router.push("/login") }, [authStatus])

  useEffect(() => {
    fetchPurchases()
    fetch("/api/suppliers").then(r => r.json()).then(d => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/products").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(() => {})
  }, [filterStatus])

  async function fetchPurchases() {
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set("status", filterStatus)
      const res = await fetch(`/api/purchases?${params}`)
      const data = await res.json()
      setPurchases(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function openCreate() {
    const nextNum = `BC-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, "0")}`
    setForm({ number: nextNum, supplierId: "", projectId: "", notes: "" })
    setFormItems([{ productId: "", quantity: 1, unitPrice: 0, total: 0, received: 0 }])
    setShowCreate(true)
  }

  function addItem() {
    setFormItems([...formItems, { productId: "", quantity: 1, unitPrice: 0, total: 0, received: 0 }])
  }

  function updateItem(idx: number, field: string, value: any) {
    const items = [...formItems]
    ;(items[idx] as any)[field] = value
    if (field === "productId") {
      const prod = products.find((p: any) => p.id === value)
      if (prod) items[idx].unitPrice = prod.unitPrice
    }
    items[idx].total = items[idx].quantity * items[idx].unitPrice
    setFormItems(items)
  }

  function removeItem(idx: number) {
    setFormItems(formItems.filter((_, i) => i !== idx))
  }

  async function handleCreate() {
    if (!form.supplierId || formItems.length === 0 || formItems.some(i => !i.productId)) {
      alert("Veuillez remplir tous les champs"); return
    }
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: formItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice }))
        })
      })
      if (!res.ok) { alert("Erreur de création"); return }
      setShowCreate(false)
      fetchPurchases()
    } catch (e) { console.error(e) }
  }

  function openReceive(po: PurchaseOrder) {
    const qtys: Record<string, number> = {}
    po.items.forEach(i => { qtys[i.id!] = 0 })
    setReceiveQtys(qtys)
    setShowReceive(po)
  }

  async function handleReceive() {
    if (!showReceive) return
    const receivedItems = Object.entries(receiveQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, receivedQty]) => ({ itemId, receivedQty }))

    if (receivedItems.length === 0) { alert("Aucune quantité saisie"); return }

    try {
      await fetch(`/api/purchases/${showReceive.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive", receivedItems })
      })
      setShowReceive(null)
      fetchPurchases()
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce BC ?")) return
    await fetch(`/api/purchases/${id}`, { method: "DELETE" })
    fetchPurchases()
  }

  async function handleChangeStatus(id: string, newStatus: string) {
    await fetch(`/api/purchases/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    })
    fetchPurchases()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory"><ArrowLeft className="h-4 w-4 mr-2" />Inventaire</Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🛒 Bons de Commande</h1>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nouveau BC</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button variant={filterStatus === "" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("")}>Tous</Button>
          {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
            <Button key={key} variant={filterStatus === key ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(key)}>{label}</Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left py-3 px-4">N°</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Fournisseur</th>
                    <th className="text-center py-3 px-4">Statut</th>
                    <th className="text-right py-3 px-4">Montant</th>
                    <th className="text-center py-3 px-4">Articles</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map(po => {
                    const st = STATUS_LABELS[po.status] || { label: po.status, color: "bg-gray-200" }
                    return (
                      <tr key={po.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4 font-mono font-bold">{po.number}</td>
                        <td className="py-3 px-4">{new Date(po.date).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3 px-4">{po.supplier.name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">{po.totalAmount.toLocaleString("fr-DZ")} DA</td>
                        <td className="py-3 px-4 text-center">{po.items.length}</td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setShowDetail(po)}><Eye className="h-3 w-3" /></Button>
                            {(po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED") && (
                              <Button size="sm" variant="ghost" className="text-green-600" onClick={() => openReceive(po)}>
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            {po.status === "DRAFT" && (
                              <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => handleChangeStatus(po.id, "ORDERED")}>
                                <ShoppingCart className="h-3 w-3" />
                              </Button>
                            )}
                            {po.status === "DRAFT" && (
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(po.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {purchases.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-500">Aucun bon de commande</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau Bon de Commande</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>N° BC</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
              <div>
                <Label>Fournisseur *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">— Sélectionner —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Projet (optionnel)</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                <option value="">— Aucun —</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="font-bold">Articles</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Ajouter</Button>
              </div>
              <div className="space-y-2">
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex-1">
                      <Label className="text-xs">Produit</Label>
                      <select className="w-full border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700" value={item.productId} onChange={(e) => updateItem(idx, "productId", e.target.value)}>
                        <option value="">—</option>
                        {products.map((p: any) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <Label className="text-xs">Qté</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs">P.U. (DA)</Label>
                      <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="w-28 text-right">
                      <Label className="text-xs">Total</Label>
                      <p className="font-bold text-sm py-1">{item.total.toLocaleString("fr-DZ")} DA</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="text-right mt-2 font-bold">
                Total: {formItems.reduce((s, i) => s + i.total, 0).toLocaleString("fr-DZ")} DA
              </div>
            </div>

            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={handleCreate}>Créer le Bon de Commande</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>BC {showDetail?.number}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Fournisseur:</span> <strong>{showDetail.supplier.name}</strong></div>
                <div><span className="text-gray-500">Date:</span> <strong>{new Date(showDetail.date).toLocaleDateString("fr-FR")}</strong></div>
                <div><span className="text-gray-500">Statut:</span> <span className={`px-2 py-1 rounded text-xs ${STATUS_LABELS[showDetail.status]?.color}`}>{STATUS_LABELS[showDetail.status]?.label}</span></div>
                <div><span className="text-gray-500">Total:</span> <strong>{showDetail.totalAmount.toLocaleString("fr-DZ")} DA</strong></div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2">Produit</th><th className="text-right py-2">Qté</th><th className="text-right py-2">P.U.</th><th className="text-right py-2">Total</th><th className="text-right py-2">Reçu</th></tr></thead>
                <tbody>
                  {showDetail.items.map(i => (
                    <tr key={i.id} className="border-b">
                      <td className="py-2">{i.product.name}</td>
                      <td className="py-2 text-right">{i.quantity} {i.product.unit}</td>
                      <td className="py-2 text-right">{i.unitPrice.toLocaleString("fr-DZ")}</td>
                      <td className="py-2 text-right font-bold">{i.total.toLocaleString("fr-DZ")}</td>
                      <td className="py-2 text-right">{i.received} {i.product.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={!!showReceive} onOpenChange={() => setShowReceive(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Réception — {showReceive?.number}</DialogTitle></DialogHeader>
          {showReceive && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Saisissez les quantités reçues pour chaque article :</p>
              {showReceive.items.map(i => {
                const remaining = i.quantity - i.received
                return (
                  <div key={i.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex-1">
                      <p className="font-medium">{i.product.name}</p>
                      <p className="text-xs text-gray-500">Commandé: {i.quantity} — Déjà reçu: {i.received} — Restant: {remaining}</p>
                    </div>
                    <Input type="number" className="w-24" placeholder="Qté" min={0} max={remaining}
                      value={receiveQtys[i.id!] || ""} onChange={(e) => setReceiveQtys({ ...receiveQtys, [i.id!]: parseFloat(e.target.value) || 0 })} />
                  </div>
                )
              })}
              <Button className="w-full" onClick={handleReceive}>
                <Check className="h-4 w-4 mr-2" />Confirmer la Réception
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
