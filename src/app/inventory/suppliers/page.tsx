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
import { ArrowLeft, Plus, Search, Truck, Pencil, Trash2, Package, ShoppingCart } from "lucide-react"

interface Supplier {
  id: string; name: string; phone?: string; address?: string; email?: string; nif?: string; rc?: string
  _count?: { products: number; purchases: number }
}

export default function SuppliersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "", nif: "", rc: "" })

  useEffect(() => { if (status === "unauthenticated") router.push("/login") }, [status])
  useEffect(() => { fetchSuppliers() }, [search])

  async function fetchSuppliers() {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/suppliers?${params}`)
      const data = await res.json()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: "", phone: "", address: "", email: "", nif: "", rc: "" })
    setShowDialog(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({ name: s.name, phone: s.phone || "", address: s.address || "", email: s.email || "", nif: s.nif || "", rc: s.rc || "" })
    setShowDialog(true)
  }

  async function handleSubmit() {
    if (!form.name) { alert("Le nom est requis"); return }
    try {
      if (editing) {
        await fetch(`/api/suppliers/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      } else {
        await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      }
      setShowDialog(false)
      fetchSuppliers()
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce fournisseur ?")) return
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" })
    fetchSuppliers()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory"><ArrowLeft className="h-4 w-4 mr-2" />Inventaire</Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚚 Fournisseurs</h1>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nouveau Fournisseur</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input placeholder="Rechercher..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{s.name}</h3>
                    {s.phone && <p className="text-sm text-gray-500">📞 {s.phone}</p>}
                    {s.email && <p className="text-sm text-gray-500">✉️ {s.email}</p>}
                    {s.address && <p className="text-sm text-gray-500 mt-1">📍 {s.address}</p>}
                    {(s.nif || s.rc) && (
                      <div className="mt-2 text-xs text-gray-400">
                        {s.nif && <span>NIF: {s.nif} </span>}
                        {s.rc && <span>RC: {s.rc}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="flex gap-4 mt-4 text-sm">
                  <span className="flex items-center gap-1 text-gray-500"><Package className="h-3 w-3" />{s._count?.products || 0} produits</span>
                  <span className="flex items-center gap-1 text-gray-500"><ShoppingCart className="h-3 w-3" />{s._count?.purchases || 0} commandes</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {suppliers.length === 0 && <p className="text-gray-500 col-span-3 text-center py-12">Aucun fournisseur</p>}
        </div>
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le Fournisseur" : "Nouveau Fournisseur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>NIF</Label><Input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} /></div>
              <div><Label>RC</Label><Input value={form.rc} onChange={(e) => setForm({ ...form, rc: e.target.value })} /></div>
            </div>
            <Button className="w-full" onClick={handleSubmit}>{editing ? "Enregistrer" : "Créer le Fournisseur"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
