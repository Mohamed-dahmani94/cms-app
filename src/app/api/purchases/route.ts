import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all purchase orders
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const supplierId = searchParams.get("supplierId")
    const projectId = searchParams.get("projectId")

    const where: any = {}
    if (status) where.status = status
    if (supplierId) where.supplierId = supplierId
    if (projectId) where.projectId = projectId

    const purchases = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { date: "desc" },
    })
    return NextResponse.json(purchases)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 })
  }
}

// POST create purchase order
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { number, supplierId, projectId, notes, items } = body

    if (!number || !supplierId || !items?.length) {
      return NextResponse.json({ error: "Number, supplier, and items are required" }, { status: 400 })
    }

    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)

    const purchase = await prisma.purchaseOrder.create({
      data: {
        number,
        supplierId,
        projectId: projectId || null,
        notes: notes || null,
        totalAmount,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    })

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
