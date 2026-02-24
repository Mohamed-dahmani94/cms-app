"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Search, Package, Pencil, Trash2, AlertTriangle } from "lucide-react"

interface Product {
  id: string; name: string; code: string; description?: string; unit: string
  category?: string; minStock: number; currentStock: number; unitPrice: number
  supplier?: { id: string; name: string }; supplierId?: string
}

const CATEGORIES = ["Ciment", "Acier", "Bois", "Plomberie", "Électricité", "Peinture", "Carrelage", "Agrégats", "Quincaillerie", "Divers"]
const UNITS = ["Kg", "Tonne", "m³", "m²", "ml", "L", "U", "Sac", "Rouleau", "Palette"]

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("")
  const [showLowStock, setShowLowStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: "", code: "", description: "", unit: "U", category: "", minStock: "0", currentStock: "0", unitPrice: "0", supplierId: "" })

  useEffect(() => { if (status === "unauthenticated") router.push("/login") }, [status])

  useEffect(() => { fetchProducts(); fetchSuppliers() }, [search, filterCat, showLowStock])

  async function fetchProducts() {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (filterCat) params.set("category", filterCat)
      if (showLowStock) params.set("lowStock", "true")
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/suppliers")
      const data = await res.json()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  function openCreate() {
    setEditingProduct(null)
    setForm({ name: "", code: "", description: "", unit: "U", category: "", minStock: "0", currentStock: "0", unitPrice: "0", supplierId: "" })
    setShowDialog(true)
  }

  function openEdit(p: Product) {
    setEditingProduct(p)
    setForm({
      name: p.name, code: p.code, description: p.description || "", unit: p.unit,
      category: p.category || "", minStock: String(p.minStock), currentStock: String(p.currentStock),
      unitPrice: String(p.unitPrice), supplierId: p.supplierId || ""
    })
    setShowDialog(true)
  }

  async function handleSubmit() {
    const data = {
      ...form,
      minStock: parseFloat(form.minStock) || 0,
      currentStock: parseFloat(form.currentStock) || 0,
      unitPrice: parseFloat(form.unitPrice) || 0,
      supplierId: form.supplierId || null,
    }

    try {
      if (editingProduct) {
        await fetch(`/api/products/${editingProduct.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      } else {
        const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        if (!res.ok) { const err = await res.json(); alert(err.error); return }
      }
      setShowDialog(false)
      fetchProducts()
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return
    await fetch(`/api/products/${id}`, { method: "DELETE" })
    fetchProducts()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory"><ArrowLeft className="h-4 w-4 mr-2" />Inventaire</Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📦 Produits</h1>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nouveau Produit</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher par nom ou code..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant={showLowStock ? "default" : "outline"} onClick={() => setShowLowStock(!showLowStock)}>
            <AlertTriangle className="h-4 w-4 mr-2" />Stock Bas
          </Button>
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left py-3 px-4">Code</th>
                    <th className="text-left py-3 px-4">Nom</th>
                    <th className="text-left py-3 px-4">Catégorie</th>
                    <th className="text-center py-3 px-4">Unité</th>
                    <th className="text-right py-3 px-4">Stock</th>
                    <th className="text-right py-3 px-4">Min</th>
                    <th className="text-right py-3 px-4">Prix U.</th>
                    <th className="text-left py-3 px-4">Fournisseur</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const isLow = p.currentStock <= p.minStock && p.minStock > 0
                    return (
                      <tr key={p.id} className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${isLow ? "bg-orange-50 dark:bg-orange-900/10" : ""}`}>
                        <td className="py-3 px-4 font-mono text-xs">{p.code}</td>
                        <td className="py-3 px-4 font-medium">{p.name}</td>
                        <td className="py-3 px-4">
                          {p.category && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">{p.category}</span>}
                        </td>
                        <td className="py-3 px-4 text-center">{p.unit}</td>
                        <td className={`py-3 px-4 text-right font-bold ${isLow ? "text-orange-600" : ""}`}>
                          {isLow && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                          {p.currentStock}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-500">{p.minStock}</td>
                        <td className="py-3 px-4 text-right">{p.unitPrice.toLocaleString("fr-DZ")} DA</td>
                        <td className="py-3 px-4 text-xs">{p.supplier?.name || "—"}</td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {products.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-500">Aucun produit trouvé</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Modifier le Produit" : "Nouveau Produit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ART-001" />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ciment CPJ 42.5" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description du produit" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unité *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <Label>Catégorie</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">— Aucune —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Stock Actuel</Label>
                <Input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
              </div>
              <div>
                <Label>Stock Minimum</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
              </div>
              <div>
                <Label>Prix Unitaire (DA)</Label>
                <Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Fournisseur</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">— Aucun —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Button className="w-full" onClick={handleSubmit}>{editingProduct ? "Enregistrer" : "Créer le Produit"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
