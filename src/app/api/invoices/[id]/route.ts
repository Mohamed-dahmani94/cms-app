import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Get single invoice with items
export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            include: {
                project: true,
                items: {
                    orderBy: { article: { code: 'asc' } },
                    include: { article: { include: { lot: true } } }
                }
            }
        })

        if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

        return NextResponse.json(invoice)
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// PATCH: Update invoice status or items
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()
        const { status, items } = body // items: [{ id, totalPercentage }]

        // Update status
        if (status) {
            const updated = await prisma.invoice.update({
                where: { id: params.id },
                data: { status }
            })
            return NextResponse.json(updated)
        }

        // Update items (Manual Override)
        if (items && Array.isArray(items)) {
            // We need to fetch the invoice to get previous values to recalculate deltas
            const invoice = await prisma.invoice.findUnique({
                where: { id: params.id },
                include: { items: true, project: true }
            })

            if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
            // Only lock if ACCOUNTED (Comptabilisée) or PAID
            if (invoice.status === 'ACCOUNTED' || invoice.status === 'PAID') return NextResponse.json({ error: "Cannot edit accounted invoice" }, { status: 400 })

            const qDecimals = invoice.project?.quantityDecimals ?? 3
            const roundQty = (val: number) => {
                const factor = Math.pow(10, qDecimals)
                return Math.round(val * factor) / factor
            }

            for (const update of items) {
                const item = invoice.items.find(i => i.id === update.id)
                if (item) {
                    // Recalculate based on new Total Percentage
                    const newTotalPercentage = parseFloat(update.totalPercentage)

                    // 1. Calculate and Round Quantity
                    const rawTotalQuantity = (item.marketQuantity * newTotalPercentage) / 100
                    const newTotalQuantity = roundQty(rawTotalQuantity)

                    // 2. Calculate Amount from Rounded Qty
                    const newTotalAmount = (item.unitPrice * newTotalQuantity)

                    // 3. Calculate Deltas
                    const newCurrentQuantity = roundQty(newTotalQuantity - item.previousQuantity)

                    // Note: Recalculate previous amount for consistency? 
                    // item.previousAmount should be item.previousQuantity * item.unitPrice
                    // If we trust item.previousQuantity is rounded, we can use it.
                    // For safety, let's behave like POST:
                    const prevAmt = item.previousQuantity * item.unitPrice

                    const newCurrentAmount = newTotalAmount - prevAmt
                    const newCurrentPercentage = parseFloat((newTotalPercentage - item.previousPercentage).toFixed(2))

                    await prisma.invoiceItem.update({
                        where: { id: item.id },
                        data: {
                            totalPercentage: newTotalPercentage,
                            totalQuantity: newTotalQuantity,
                            totalAmount: newTotalAmount,
                            currentQuantity: newCurrentQuantity,
                            currentAmount: newCurrentAmount,
                            currentPercentage: newCurrentPercentage
                        }
                    })
                }
            }

            // Recalculate Invoice Total
            const freshItems = await prisma.invoiceItem.findMany({ where: { invoiceId: params.id } })
            const newTotal = freshItems.reduce((sum, i) => sum + i.currentAmount, 0) // Sum Period Amounts

            const updatedInvoice = await prisma.invoice.update({
                where: { id: params.id },
                data: { totalAmount: newTotal },
                include: { items: true }
            })

            return NextResponse.json(updatedInvoice)
        }

        return NextResponse.json({ error: "No valid update data" }, { status: 400 })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
