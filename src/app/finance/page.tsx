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
import { 
  ArrowLeft, Plus, DollarSign, Wallet, TrendingUp, TrendingDown, 
  Pencil, Trash2, Eye, Building, User
} from "lucide-react"

interface CashRegister {
  id: string; name: string; type: string; balance: number
  projectId?: string; userId?: string
  transactions: any[]; _count: { transactions: number }
}

const TX_CATEGORIES = ["Achat matériaux", "Salaire", "Vente", "Transport", "Location", "Sous-traitance", "Frais administratifs", "Divers"]

export default function FinancePage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showTx, setShowTx] = useState<CashRegister | null>(null)
  const [showAddTx, setShowAddTx] = useState(false)
  const [txList, setTxList] = useState<any[]>([])
  const [form, setForm] = useState({ name: "", type: "PROJECT", projectId: "", userId: "", balance: "0" })
  const [txForm, setTxForm] = useState({ type: "OUT", amount: "", description: "", category: "", reference: "" })

  useEffect(() => { if (authStatus === "unauthenticated") router.push("/login") }, [authStatus])

  useEffect(() => {
    fetchRegisters()
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function fetchRegisters() {
    try {
      const res = await fetch("/api/cash-registers")
      const data = await res.json()
      setRegisters(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function openRegister(reg: CashRegister) {
    setShowTx(reg)
    const res = await fetch(`/api/cash-registers/${reg.id}`)
    const full = await res.json()
    setTxList(full.transactions || [])
  }

  function openCreateRegister() {
    setForm({ name: "", type: "PROJECT", projectId: "", userId: "", balance: "0" })
    setShowCreate(true)
  }

  async function handleCreateRegister() {
    if (!form.name) { alert("Le nom est requis"); return }
    await fetch("/api/cash-registers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0 })
    })
    setShowCreate(false)
    fetchRegisters()
  }

  async function handleDeleteRegister(id: string) {
    if (!confirm("Supprimer cette caisse ?")) return
    await fetch(`/api/cash-registers/${id}`, { method: "DELETE" })
    fetchRegisters()
  }

  function openAddTx() {
    setTxForm({ type: "OUT", amount: "", description: "", category: "", reference: "" })
    setShowAddTx(true)
  }

  async function handleAddTx() {
    if (!txForm.amount || !txForm.description || !showTx) { alert("Montant et description requis"); return }
    await fetch("/api/cash-transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...txForm, amount: parseFloat(txForm.amount), registerId: showTx.id })
    })
    setShowAddTx(false)
    // Refresh
    openRegister(showTx)
    fetchRegisters()
  }

  const totalBalance = registers.reduce((s, r) => s + r.balance, 0)
  const projectRegisters = registers.filter(r => r.type === "PROJECT")
  const userRegisters = registers.filter(r => r.type === "USER")

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" />Accueil</Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">💰 Finance — Caisses</h1>
          </div>
          <Button onClick={openCreateRegister}><Plus className="h-4 w-4 mr-2" />Nouvelle Caisse</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Total Balance */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-900/20 dark:to-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Solde Total — Toutes Caisses</p>
                <p className={`text-4xl font-bold ${totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalBalance.toLocaleString("fr-DZ")} DA
                </p>
              </div>
              <Wallet className="h-14 w-14 text-green-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        {/* Project Cash Registers */}
        {projectRegisters.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Building className="h-5 w-5" />Caisses Projets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectRegisters.map(r => (
                <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openRegister(r)}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{r.name}</h3>
                        <p className="text-xs text-gray-500">{r._count.transactions} transactions</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteRegister(r.id) }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className={`text-2xl font-bold mt-3 ${r.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {r.balance.toLocaleString("fr-DZ")} DA
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* User Cash Registers */}
        {userRegisters.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="h-5 w-5" />Caisses Utilisateurs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userRegisters.map(r => (
                <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openRegister(r)}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{r.name}</h3>
                        <p className="text-xs text-gray-500">{r._count.transactions} transactions</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteRegister(r.id) }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className={`text-2xl font-bold mt-3 ${r.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {r.balance.toLocaleString("fr-DZ")} DA
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {registers.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Wallet className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucune caisse créée</p>
            <p className="text-sm">Créez une caisse pour commencer à suivre vos finances</p>
          </div>
        )}
      </main>

      {/* Create Register Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle Caisse</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Caisse Projet AADL" /></div>
            <div>
              <Label>Type *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PROJECT">Caisse Projet</option>
                <option value="USER">Caisse Utilisateur</option>
              </select>
            </div>
            {form.type === "PROJECT" && (
              <div>
                <Label>Projet</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">— Sélectionner —</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {form.type === "USER" && (
              <div>
                <Label>Utilisateur</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                  <option value="">— Sélectionner —</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div><Label>Solde Initial (DA)</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
            <Button className="w-full" onClick={handleCreateRegister}>Créer la Caisse</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={!!showTx} onOpenChange={() => setShowTx(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>{showTx?.name}</span>
              <span className={`text-xl ${(showTx?.balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {showTx?.balance.toLocaleString("fr-DZ")} DA
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button onClick={openAddTx} className="w-full"><Plus className="h-4 w-4 mr-2" />Nouvelle Transaction</Button>
            
            <div className="space-y-2">
              {txList.map((tx: any) => (
                <div key={tx.id} className={`flex items-center justify-between p-3 rounded-lg ${tx.type === "IN" ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      <span>{new Date(tx.date).toLocaleDateString("fr-FR")}</span>
                      {tx.category && <span className="px-1 bg-gray-200 dark:bg-gray-700 rounded">{tx.category}</span>}
                      {tx.reference && <span>Ref: {tx.reference}</span>}
                    </div>
                  </div>
                  <p className={`font-bold text-lg ${tx.type === "IN" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "IN" ? "+" : "-"}{tx.amount.toLocaleString("fr-DZ")} DA
                  </p>
                </div>
              ))}
              {txList.length === 0 && <p className="text-center text-gray-500 py-8">Aucune transaction</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTx} onOpenChange={setShowAddTx}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type *</Label>
              <div className="flex gap-2 mt-1">
                <Button variant={txForm.type === "IN" ? "default" : "outline"} className={txForm.type === "IN" ? "bg-green-600" : ""} onClick={() => setTxForm({ ...txForm, type: "IN" })}>
                  <TrendingUp className="h-4 w-4 mr-1" />Entrée
                </Button>
                <Button variant={txForm.type === "OUT" ? "default" : "outline"} className={txForm.type === "OUT" ? "bg-red-600" : ""} onClick={() => setTxForm({ ...txForm, type: "OUT" })}>
                  <TrendingDown className="h-4 w-4 mr-1" />Sortie
                </Button>
              </div>
            </div>
            <div><Label>Montant (DA) *</Label><Input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} /></div>
            <div><Label>Description *</Label><Input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} placeholder="Achat ciment" /></div>
            <div>
              <Label>Catégorie</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}>
                <option value="">— Aucune —</option>
                {TX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Référence</Label><Input value={txForm.reference} onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })} placeholder="BC-001, Facture N°..." /></div>
            <Button className="w-full" onClick={handleAddTx}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
