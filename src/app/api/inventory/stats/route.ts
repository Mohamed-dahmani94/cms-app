import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET inventory statistics
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { supplier: true },
    })

    const totalProducts = products.length
    const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.unitPrice), 0)
    const lowStockProducts = products.filter(p => p.currentStock <= p.minStock && p.minStock > 0)
    const outOfStock = products.filter(p => p.currentStock === 0)

    // Category breakdown
    const categories: Record<string, { count: number; value: number }> = {}
    products.forEach(p => {
      const cat = p.category || "Non classé"
      if (!categories[cat]) categories[cat] = { count: 0, value: 0 }
      categories[cat].count++
      categories[cat].value += p.currentStock * p.unitPrice
    })

    // Recent movements
    const recentMovements = await prisma.stockMovement.findMany({
      include: { product: true },
      orderBy: { date: "desc" },
      take: 10,
    })

    // Movement stats (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentMovementStats = await prisma.stockMovement.findMany({
      where: { date: { gte: thirtyDaysAgo } },
    })

    const movementsByType: Record<string, { count: number; total: number }> = {}
    recentMovementStats.forEach(m => {
      if (!movementsByType[m.type]) movementsByType[m.type] = { count: 0, total: 0 }
      movementsByType[m.type].count++
      movementsByType[m.type].total += m.total
    })

    // Pending purchase orders
    const pendingPurchases = await prisma.purchaseOrder.count({
      where: { status: { in: ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED"] } },
    })

    // Suppliers count
    const suppliersCount = await prisma.supplier.count()

    return NextResponse.json({
      totalProducts,
      totalValue,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 5),
      outOfStockCount: outOfStock.length,
      categories,
      recentMovements,
      movementsByType,
      pendingPurchases,
      suppliersCount,
    })
  } catch (error) {
    console.error("Error fetching inventory stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
