import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all stock movements
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const productId = searchParams.get("productId")
    const projectId = searchParams.get("projectId")
    const supplierId = searchParams.get("supplierId")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = {}
    if (type) where.type = type
    if (productId) where.productId = productId
    if (projectId) where.projectId = projectId
    if (supplierId) where.supplierId = supplierId

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { product: true, supplier: true },
      orderBy: { date: "desc" },
      take: limit,
    })
    return NextResponse.json(movements)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch movements" }, { status: 500 })
  }
}

// POST create stock movement(s)
// Supports single movement OR batch (array of items with shared supplier/type/project)
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // === BATCH MODE: { type, supplierId, projectId, reason, reference, items: [{productId, quantity, unitPrice}] }
    if (body.items && Array.isArray(body.items)) {
      const { type, supplierId, projectId, userId, reason, reference, items } = body

      if (!type || items.length === 0) {
        return NextResponse.json({ error: "Type et au moins un produit requis" }, { status: 400 })
      }

      // Generate a batch reference for grouping
      const batchRef = `BL-${Date.now().toString(36).toUpperCase()}`
      const isIncoming = type === "ENTRY" || type === "RETURN"

      // Validate all products exist and stock is sufficient
      const productIds = items.map((i: any) => i.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
      })

      if (products.length !== productIds.length) {
        return NextResponse.json({ error: "Un ou plusieurs produits introuvables" }, { status: 404 })
      }

      // Check stock for outgoing movements
      if (!isIncoming) {
        for (const item of items) {
          const prod = products.find((p: any) => p.id === item.productId)
          if (prod && prod.currentStock < item.quantity) {
            return NextResponse.json({ 
              error: `Stock insuffisant pour ${prod.name} (dispo: ${prod.currentStock}, demandé: ${item.quantity})` 
            }, { status: 400 })
          }
        }
      }

      // Create all movements + update stock in a single transaction
      const operations: any[] = []
      
      for (const item of items) {
        const prod = products.find((p: any) => p.id === item.productId)!
        const price = item.unitPrice || prod.unitPrice
        const total = item.quantity * price

        operations.push(
          prisma.stockMovement.create({
            data: {
              type,
              quantity: item.quantity,
              unitPrice: price,
              total,
              reason: reason || null,
              productId: item.productId,
              supplierId: supplierId || null,
              projectId: projectId || null,
              userId: userId || null,
              reference: reference || null,
              batchRef,
            },
          })
        )

        const stockChange = isIncoming ? item.quantity : -item.quantity
        operations.push(
          prisma.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: stockChange } },
          })
        )
      }

      const results = await prisma.$transaction(operations)
      // Filter only movement records (odd indexes are product updates)
      const movements = results.filter((_: any, i: number) => i % 2 === 0)

      return NextResponse.json({ batchRef, count: movements.length, movements }, { status: 201 })
    }

    // === SINGLE MODE (backward compatible)
    const { type, quantity, unitPrice, reason, productId, projectId, userId, reference, supplierId } = body

    if (!type || !quantity || !productId) {
      return NextResponse.json({ error: "Type, quantity, and product are required" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    const price = unitPrice || product.unitPrice
    const total = quantity * price

    const isIncoming = type === "ENTRY" || type === "RETURN"
    const stockChange = isIncoming ? quantity : -quantity

    if (!isIncoming && product.currentStock < quantity) {
      return NextResponse.json({ error: "Stock insuffisant" }, { status: 400 })
    }

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          type,
          quantity,
          unitPrice: price,
          total,
          reason: reason || null,
          productId,
          supplierId: supplierId || null,
          projectId: projectId || null,
          userId: userId || null,
          reference: reference || null,
        },
        include: { product: true },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { currentStock: { increment: stockChange } },
      }),
    ])

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error("Error creating movement:", error)
    return NextResponse.json({ error: "Failed to create movement" }, { status: 500 })
  }
}
