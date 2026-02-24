import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single purchase order
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    })
    if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(purchase)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch purchase order" }, { status: 500 })
  }
}

// PATCH update purchase order (status, receive items)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // If receiving items, update stock
    if (body.action === "receive") {
      const { receivedItems } = body // [{ itemId, receivedQty }]

      for (const ri of receivedItems) {
        const item = await prisma.purchaseOrderItem.findUnique({
          where: { id: ri.itemId },
          include: { product: true },
        })
        if (!item) continue

        const newReceived = item.received + ri.receivedQty

        // Update purchase item
        await prisma.purchaseOrderItem.update({
          where: { id: ri.itemId },
          data: { received: newReceived },
        })

        // Update product stock
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: ri.receivedQty },
            unitPrice: item.unitPrice, // Update with latest purchase price
          },
        })

        // Create stock movement
        const purchase = await prisma.purchaseOrder.findUnique({ where: { id } })
        await prisma.stockMovement.create({
          data: {
            type: "ENTRY",
            quantity: ri.receivedQty,
            unitPrice: item.unitPrice,
            total: ri.receivedQty * item.unitPrice,
            reason: `Réception BC ${purchase?.number || id}`,
            productId: item.productId,
            projectId: purchase?.projectId,
            reference: purchase?.number,
          },
        })
      }

      // Check if all items are fully received
      const allItems = await prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      })
      const allReceived = allItems.every(i => i.received >= i.quantity)
      const someReceived = allItems.some(i => i.received > 0)

      await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: allReceived ? "RECEIVED" : someReceived ? "PARTIALLY_RECEIVED" : "ORDERED",
        },
      })
    } else {
      // Simple field update
      await prisma.purchaseOrder.update({
        where: { id },
        data: body,
      })
    }

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { product: true } } },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 })
  }
}

// DELETE purchase order
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.purchaseOrder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 })
  }
}
