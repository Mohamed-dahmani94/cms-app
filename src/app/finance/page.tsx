"use client"

import { useEffect, useState, useMemo } from "react"
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
  Pencil, Trash2, Eye, Building, User, Printer, Download, ArrowRightLeft, Settings
} from "lucide-react"

interface CashRegister {
  id: string; name: string; type: string; balance: number
  projectId?: string; userId?: string
  transactions: any[]; _count: { transactions: number }
}

export default function FinancePage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  
  // Data States
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog States
  const [showCreate, setShowCreate] = useState(false)
  const [showCatAdmin, setShowCatAdmin] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  
  // Register Actions
  const [showTx, setShowTx] = useState<CashRegister | null>(null)
  const [txList, setTxList] = useState<any[]>([])
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null)

  // Tx Actions
  const [showTxForm, setShowTxForm] = useState(false)
  const [editingTx, setEditingTx] = useState<any | null>(null)

  // Form States
  const [form, setForm] = useState({ name: "", type: "PROJECT", projectId: "", userId: "", balance: "0" })
  const [txForm, setTxForm] = useState({ type: "OUT", amount: "", description: "", category: "", reference: "" })
  const [catForm, setCatForm] = useState({ name: "", color: "#2563EB" })
  const [transferForm, setTransferForm] = useState({ fromRegisterId: "", toRegisterId: "", amount: "", description: "", category: "Transfert" })

  // Filters
  const [txFilterType, setTxFilterType] = useState<string>("ALL")
  const [txFilterCat, setTxFilterCat] = useState<string>("ALL")

  useEffect(() => { if (authStatus === "unauthenticated") router.push("/login") }, [authStatus])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [regRes, projRes, userRes, catRes] = await Promise.all([
        fetch("/api/cash-registers").catch(() => null),
        fetch("/api/projects").catch(() => null),
        fetch("/api/users").catch(() => null),
        fetch("/api/transaction-categories").catch(() => null)
      ])
      
      if (regRes) { const d = await regRes.json(); setRegisters(Array.isArray(d) ? d : []) }
      if (projRes) { const d = await projRes.json(); setProjects(Array.isArray(d) ? d : []) }
      if (userRes) { const d = await userRes.json(); setUsers(Array.isArray(d) ? d : []) }
      if (catRes) { const d = await catRes.json(); setCategories(Array.isArray(d) ? d : []) }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // --- REGISTERS ---
  function openCreateRegister() {
    setEditingRegister(null)
    setForm({ name: "", type: "PROJECT", projectId: "", userId: "", balance: "0" })
    setShowCreate(true)
  }

  function openEditRegister(reg: CashRegister, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingRegister(reg)
    setForm({ 
      name: reg.name, 
      type: reg.type, 
      projectId: reg.projectId || "", 
      userId: reg.userId || "", 
      balance: reg.balance.toString() 
    })
    setShowCreate(true)
  }

  async function handleSaveRegister() {
    if (!form.name) { alert("Le nom est requis"); return }
    
    if (editingRegister) {
      await fetch(`/api/cash-registers/${editingRegister.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0 })
      })
    } else {
      await fetch("/api/cash-registers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0 })
      })
    }
    setShowCreate(false)
    fetchData()
  }

  async function handleDeleteRegister(id: string) {
    if (!confirm("Supprimer cette caisse ?")) return
    await fetch(`/api/cash-registers/${id}`, { method: "DELETE" })
    fetchData()
  }

  async function openRegister(reg: CashRegister) {
    setShowTx(reg)
    const res = await fetch(`/api/cash-registers/${reg.id}`)
    const full = await res.json()
    setTxList(full.transactions || [])
  }

  // --- TRANSACTIONS ---
  function openAddTx() {
    setEditingTx(null)
    setTxForm({ type: "OUT", amount: "", description: "", category: "", reference: "" })
    setShowTxForm(true)
  }

  function openEditTx(tx: any) {
    setEditingTx(tx)
    setTxForm({ 
      type: tx.type, 
      amount: tx.amount.toString(), 
      description: tx.description, 
      category: tx.category || "", 
      reference: tx.reference || "" 
    })
    setShowTxForm(true)
  }

  async function handleSaveTx() {
    if (!txForm.amount || !txForm.description || !showTx) { alert("Montant et description requis"); return }
    
    // Add user tracking details
    const payload = { 
      ...txForm, 
      amount: parseFloat(txForm.amount), 
      registerId: showTx.id,
      userId: (session?.user as any)?.id, 
      updatedById: (session?.user as any)?.id 
    }

    if (editingTx) {
      await fetch(`/api/cash-transactions/${editingTx.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    } else {
      await fetch("/api/cash-transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    }
    
    setShowTxForm(false)
    openRegister(showTx)
    fetchData()
  }

  async function handleDeleteTx(txId: string) {
    if (!confirm("Supprimer cette transaction ?")) return
    await fetch(`/api/cash-transactions/${txId}`, { method: "DELETE" })
    openRegister(showTx!)
    fetchData()
  }

  // --- TRANSFERS ---
  async function handleTransfer() {
    if (!transferForm.fromRegisterId || !transferForm.toRegisterId || !transferForm.amount) {
      alert("Veuillez remplir les champs obligatoires")
      return
    }
    if (transferForm.fromRegisterId === transferForm.toRegisterId) {
      alert("Impossible de transférer vers la même caisse")
      return
    }

    await fetch("/api/cash-transactions/transfer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...transferForm,
        userId: (session?.user as any)?.id
      })
    })

    setShowTransfer(false)
    setTransferForm({ fromRegisterId: "", toRegisterId: "", amount: "", description: "", category: "Transfert" })
    fetchData()
  }

  // --- CATEGORIES ---
  async function handleAddCategory() {
    if (!catForm.name) return
    await fetch("/api/transaction-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm)
    })
    setCatForm({ name: "", color: "#2563EB" })
    fetchData()
  }

  async function handleDeleteCategory(id: string) {
    await fetch(`/api/transaction-categories/${id}`, { method: "DELETE" })
    fetchData()
  }

  // --- PRINT / EXPORT ---
  function printReceipt(tx: any) {
    const w = window.open('', '_blank')
    if (!w) return
    const isOut = tx.type === "OUT"
    w.document.write(`
      <html>
        <head>
          <title>Reçu de Transaction - ${tx.number || tx.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
            .amount { font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0; color: ${isOut ? "#dc2626" : "#16a34a"}; }
            .details table { width: 100%; border-collapse: collapse; }
            .details th, .details td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px; color: #666; }
            .signature-box { border-top: 1px solid #000; padding-top: 10px; width: 200px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>REÇU DE CAISSE</h2>
            <p>Réf: ${tx.number || tx.id}</p>
            <p>Date: ${new Date(tx.date).toLocaleString('fr-FR')}</p>
          </div>
          <div class="amount">
            ${isOut ? "SORTIE : " : "ENTRÉE : "} ${tx.amount.toLocaleString("fr-DZ")} DA
          </div>
          <div class="details">
            <table>
              <tr><th>Description</th><td>${tx.description}</td></tr>
              <tr><th>Catégorie</th><td>${tx.category || '-'}</td></tr>
              <tr><th>Caisse</th><td>${showTx?.name}</td></tr>
              ${tx.reference ? `<tr><th>Document Référence</th><td>${tx.reference}</td></tr>` : ''}
              <tr><th>Créé par</th><td>${tx.createdBy?.name || '-'}</td></tr>
            </table>
          </div>
          <div class="footer">
            <div class="signature-box">Signature Émetteur</div>
            <div class="signature-box">Signature Bénéficiaire</div>
          </div>
          <script>window.print(); setTimeout(()=>window.close(), 500);</script>
        </body>
      </html>
    `)
    w.document.close()
  }
  // --- FILTERING & STATS ---
  const filteredTxs = useMemo(() => {
    return txList.filter(tx => {
      if (txFilterType !== "ALL" && tx.type !== txFilterType) return false
      if (txFilterCat !== "ALL" && tx.category !== txFilterCat) return false
      return true
    })
  }, [txList, txFilterType, txFilterCat])

  const stats = useMemo(() => {
    let inputs = 0; let outputs = 0;
    filteredTxs.forEach((t: any) => {
      if (t.type === "IN") inputs += t.amount
      else outputs += t.amount
    })
    return { inputs, outputs }
  }, [filteredTxs])

  function exportCSV() {
    if (!showTx) return
    const headers = ["ID", "Reference", "Date", "Type", "Montant", "Description", "Categorie", "CreePar"]
    const rows = filteredTxs.map((t: any) => [
      t.number || t.id,
      t.reference || "",
      new Date(t.date).toISOString(),
      t.type,
      t.amount,
      t.description,
      t.category || "",
      t.createdBy?.name || ""
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `transactions_caisse_${showTx.id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCatAdmin(true)}>
              <Settings className="h-4 w-4 mr-2" />Catégories
            </Button>
            <Button variant="secondary" onClick={() => setShowTransfer(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />Transfert
            </Button>
            <Button onClick={openCreateRegister}>
              <Plus className="h-4 w-4 mr-2" />Nouvelle Caisse
            </Button>
          </div>
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
                <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => openRegister(r)}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{r.name}</h3>
                        <p className="text-xs text-gray-500">{r._count.transactions} transactions</p>
                      </div>
                      <div className="flex gap-1 bg-white/50 backdrop-blur rounded p-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" onClick={(e) => openEditRegister(r, e)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteRegister(r.id) }}>
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
                <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => openRegister(r)}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{r.name}</h3>
                        <p className="text-xs text-gray-500">{r._count.transactions} transactions</p>
                      </div>
                      <div className="flex gap-1 bg-white/50 backdrop-blur rounded p-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" onClick={(e) => openEditRegister(r, e)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteRegister(r.id) }}>
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

        {registers.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Wallet className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucune caisse créée</p>
            <p className="text-sm">Créez une caisse pour commencer à suivre vos finances</p>
          </div>
        )}
      </main>

      {/* -------------------- MODALS -------------------- */}

      {/* 1. Create/Edit Register Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRegister ? "Modifier la Caisse" : "Nouvelle Caisse"}</DialogTitle></DialogHeader>
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
            {!editingRegister && (
              <div><Label>Solde Initial (DA)</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
            )}
            <Button className="w-full" onClick={handleSaveRegister}>{editingRegister ? "Mettre à jour" : "Créer"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transférer de l'argent</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Caisse Source *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={transferForm.fromRegisterId} onChange={(e) => setTransferForm({ ...transferForm, fromRegisterId: e.target.value })}>
                <option value="">— Sélectionner —</option>
                {registers.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.balance} DA)</option>)}
              </select>
            </div>
            <div className="flex justify-center -my-2"><ArrowRightLeft className="text-gray-400 rotate-90" /></div>
            <div>
              <Label>Caisse Destination *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={transferForm.toRegisterId} onChange={(e) => setTransferForm({ ...transferForm, toRegisterId: e.target.value })}>
                <option value="">— Sélectionner —</option>
                {registers.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.balance} DA)</option>)}
              </select>
            </div>
            <div><Label>Montant (DA) *</Label><Input type="number" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} /></div>
            <div><Label>Motif</Label><Input value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} placeholder="Ex: Avance de frais" /></div>
            <Button className="w-full" onClick={handleTransfer}>Exécuter le Transfert</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Category Manager Dialog */}
      <Dialog open={showCatAdmin} onOpenChange={setShowCatAdmin}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gestion des Catégories</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Nouvelle catégorie" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
              <Button onClick={handleAddCategory}>Ajouter</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span>{c.name}</span>
                  <Button size="icon" variant="ghost" className="text-red-500 h-6 w-6" onClick={() => handleDeleteCategory(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-center text-gray-500">Aucune catégorie</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Transactions List Dialog */}
      <Dialog open={!!showTx} onOpenChange={() => {setShowTx(null); setTxFilterType("ALL"); setTxFilterCat("ALL")}}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>{showTx?.name}</span>
              <span className={`text-xl ${(showTx?.balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {showTx?.balance.toLocaleString("fr-DZ")} DA
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex gap-2">
              <select className="border rounded text-sm p-1.5 dark:bg-gray-900" value={txFilterType} onChange={e => setTxFilterType(e.target.value)}>
                <option value="ALL">Tous les Types</option>
                <option value="IN">Entrées (+)</option>
                <option value="OUT">Sorties (-)</option>
              </select>
              <select className="border rounded text-sm p-1.5 dark:bg-gray-900" value={txFilterCat} onChange={e => setTxFilterCat(e.target.value)}>
                <option value="ALL">Toutes les Catégories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 text-sm items-center">
              {txFilterType !== "OUT" && <span className="text-green-600 font-bold border rounded px-2">IN: {stats.inputs.toLocaleString("fr-DZ")}</span>}
              {txFilterType !== "IN" && <span className="text-red-600 font-bold border rounded px-2">OUT: {stats.outputs.toLocaleString("fr-DZ")}</span>}
              
              <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
              <Button size="sm" onClick={openAddTx}><Plus className="h-4 w-4 mr-1" />Nouvelle</Button>
            </div>
          </div>
            
          <div className="space-y-2">
            {filteredTxs.map((tx: any) => (
              <div key={tx.id} className={`flex items-center justify-between p-3 rounded-lg border ${tx.type === "IN" ? "bg-green-50/50 dark:bg-green-900/10 border-green-100" : "bg-red-50/50 dark:bg-red-900/10 border-red-100"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{tx.description}</p>
                    {tx.number && <span className="text-[10px] bg-gray-200 dark:bg-gray-700 font-mono px-1 rounded">{tx.number}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                    <span>{new Date(tx.date).toLocaleString("fr-FR")}</span>
                    {tx.category && <span className="px-1.5 bg-white dark:bg-gray-800 border rounded">{tx.category}</span>}
                    {tx.reference && <span>Réf: {tx.reference}</span>}
                    {tx.createdBy && <span>Par: {tx.createdBy.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-bold text-lg ${tx.type === "IN" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "IN" ? "+" : "-"}{tx.amount.toLocaleString("fr-DZ")} DA
                  </p>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-600" onClick={() => printReceipt(tx)}><Printer className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-600" onClick={() => openEditTx(tx)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => handleDeleteTx(tx.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredTxs.length === 0 && <p className="text-center text-gray-500 py-8">Aucune transaction trouvée</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Add/Edit Transaction Dialog */}
      <Dialog open={showTxForm} onOpenChange={setShowTxForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTx ? "Modifier la Transaction" : "Nouvelle Transaction"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type *</Label>
              <div className="flex gap-2 mt-1">
                <Button variant={txForm.type === "IN" ? "default" : "outline"} className={txForm.type === "IN" ? "bg-green-600" : ""} onClick={() => setTxForm({ ...txForm, type: "IN" })} disabled={!!editingTx}>
                  <TrendingUp className="h-4 w-4 mr-1" />Entrée
                </Button>
                <Button variant={txForm.type === "OUT" ? "default" : "outline"} className={txForm.type === "OUT" ? "bg-red-600" : ""} onClick={() => setTxForm({ ...txForm, type: "OUT" })} disabled={!!editingTx}>
                  <TrendingDown className="h-4 w-4 mr-1" />Sortie
                </Button>
              </div>
            </div>
            <div>
              <Label>Montant (DA) *</Label>
              <Input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
            </div>
            <div><Label>Description *</Label><Input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} placeholder="Achat ciment" /></div>
            <div>
              <Label>Catégorie</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}>
                <option value="">— Aucune —</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Référence (Document)</Label><Input value={txForm.reference} onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })} placeholder="BC-001, Facture N°..." /></div>
            <Button className="w-full" onClick={handleSaveTx}>{editingTx ? "Mettre à jour" : "Enregistrer"}</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
