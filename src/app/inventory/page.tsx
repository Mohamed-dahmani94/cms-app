"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Package, AlertTriangle, TrendingUp, TrendingDown, ArrowLeft,
  Plus, Search, Truck, ShoppingCart, ArrowUpDown, DollarSign, BarChart3
} from "lucide-react"

export default function InventoryDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status])

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch("/api/inventory/stats")
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const movementTypes: Record<string, { label: string; color: string; icon: any }> = {
    ENTRY: { label: "Entrées", color: "text-green-600", icon: TrendingUp },
    EXIT: { label: "Sorties", color: "text-red-600", icon: TrendingDown },
    CONSUMPTION: { label: "Consommation", color: "text-orange-600", icon: Package },
    SALE: { label: "Ventes", color: "text-blue-600", icon: DollarSign },
    RETURN: { label: "Retours", color: "text-purple-600", icon: ArrowUpDown },
    ADJUSTMENT: { label: "Ajustements", color: "text-gray-600", icon: BarChart3 },
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" />Accueil</Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              📦 Inventaire
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Produits</p>
                  <p className="text-3xl font-bold">{stats.totalProducts}</p>
                </div>
                <Package className="h-10 w-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Valeur du Stock</p>
                  <p className="text-3xl font-bold">{(stats.totalValue || 0).toLocaleString("fr-DZ")} DA</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stock Bas</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.lowStockCount}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">BC En Cours</p>
                  <p className="text-3xl font-bold">{stats.pendingPurchases}</p>
                </div>
                <ShoppingCart className="h-10 w-10 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Button asChild className="h-20 flex-col gap-2" variant="outline">
            <Link href="/inventory/products">
              <Package className="h-6 w-6" />
              <span>Produits</span>
            </Link>
          </Button>
          <Button asChild className="h-20 flex-col gap-2" variant="outline">
            <Link href="/inventory/suppliers">
              <Truck className="h-6 w-6" />
              <span>Fournisseurs</span>
            </Link>
          </Button>
          <Button asChild className="h-20 flex-col gap-2" variant="outline">
            <Link href="/inventory/purchases">
              <ShoppingCart className="h-6 w-6" />
              <span>Bons de Commande</span>
            </Link>
          </Button>
          <Button asChild className="h-20 flex-col gap-2" variant="outline">
            <Link href="/inventory/movements">
              <ArrowUpDown className="h-6 w-6" />
              <span>Mouvements</span>
            </Link>
          </Button>
          <Button asChild className="h-20 flex-col gap-2" variant="outline">
            <Link href="/finance">
              <DollarSign className="h-6 w-6" />
              <span>Caisse</span>
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Alertes Stock Bas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.lowStockProducts?.length > 0 ? (
                <div className="space-y-3">
                  {stats.lowStockProducts.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-sm text-gray-500">{p.code} — {p.category || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">{p.currentStock} {p.unit}</p>
                        <p className="text-xs text-gray-500">Min: {p.minStock} {p.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Aucune alerte — stock OK ✅</p>
              )}
            </CardContent>
          </Card>

          {/* Movements Summary (Last 30 Days) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Mouvements (30 derniers jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.movementsByType || {}).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.movementsByType).map(([type, data]: [string, any]) => {
                    const mt = movementTypes[type] || { label: type, color: "text-gray-600", icon: Package }
                    const Icon = mt.icon
                    return (
                      <div key={type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${mt.color}`} />
                          <div>
                            <p className="font-medium">{mt.label}</p>
                            <p className="text-sm text-gray-500">{data.count} opération(s)</p>
                          </div>
                        </div>
                        <p className={`font-bold ${mt.color}`}>{data.total.toLocaleString("fr-DZ")} DA</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Aucun mouvement ce mois</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Movements */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Derniers Mouvements</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentMovements?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-left py-2 px-3">Type</th>
                        <th className="text-left py-2 px-3">Produit</th>
                        <th className="text-right py-2 px-3">Quantité</th>
                        <th className="text-right py-2 px-3">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentMovements.map((m: any) => {
                        const mt = movementTypes[m.type] || { label: m.type, color: "text-gray-600" }
                        return (
                          <tr key={m.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-2 px-3">{new Date(m.date).toLocaleDateString("fr-FR")}</td>
                            <td className={`py-2 px-3 font-medium ${mt.color}`}>{mt.label}</td>
                            <td className="py-2 px-3">{m.product?.name || "—"}</td>
                            <td className="py-2 px-3 text-right">{m.quantity} {m.product?.unit}</td>
                            <td className="py-2 px-3 text-right">{m.total.toLocaleString("fr-DZ")} DA</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Aucun mouvement enregistré</p>
              )}
            </CardContent>
          </Card>

          {/* Categories Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Répartition par Catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.categories || {}).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(stats.categories).map(([cat, data]: [string, any]) => (
                    <div key={cat} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      <p className="font-medium text-sm">{cat}</p>
                      <p className="text-2xl font-bold mt-1">{data.count}</p>
                      <p className="text-xs text-gray-500">{data.value.toLocaleString("fr-DZ")} DA</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Aucune catégorie</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
