import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: List all invoices for a project
export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const invoices = await prisma.invoice.findMany({
            where: { projectId: params.id },
            orderBy: { date: 'desc' },
            include: {
                _count: { select: { items: true } }
            }
        })

        return NextResponse.json(invoices)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: Create a new invoice (Snapshot)
export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()
        const { number, date, periodStart, periodEnd } = body

        // 0. Fetch Project Settings
        const project = await prisma.project.findUnique({
            where: { id: params.id },
            select: { quantityDecimals: true }
        })
        const qDecimals = project?.quantityDecimals ?? 3
        const roundQty = (val: number) => {
            const factor = Math.pow(10, qDecimals)
            return Math.round(val * factor) / factor
        }

        // 1. Fetch Market Data for the project
        const market = await prisma.market.findUnique({
            where: { projectId: params.id },
            include: {
                lots: {
                    include: {
                        articles: {
                            include: {
                                tasks: { include: { subTasks: true } }
                            }
                        }
                    }
                }
            }
        })

        if (!market) return NextResponse.json({ error: "No market found" }, { status: 404 })

        // 2. Fetch Previous Invoice (validated) to get previous quantities
        const lastInvoice = await prisma.invoice.findFirst({
            where: { projectId: params.id, status: 'VALIDATED' },
            orderBy: { date: 'desc' },
            include: { items: true }
        })

        const previousItemsMap = new Map()
        if (lastInvoice) {
            lastInvoice.items.forEach(item => {
                previousItemsMap.set(item.articleId, item)
            })
        }

        // 3. Prepare Invoice Items
        const invoiceItemsData = []
        let totalInvoiceAmount = 0 // This will now represent the Sum of Current Amounts (Billable for this period)

        for (const lot of market.lots) {
            for (const article of lot.articles) {
                // Calculate current progress from tasks (Auto-fill)
                const tasks = article.tasks || []
                let calculatedProgress = 0

                if (tasks.length > 0) {
                    const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0)
                    if (totalDuration > 0) {
                        const weightedSum = tasks.reduce((sum, t) => {
                            const subTasks = (t.subTasks || []).filter(st => !st.isReserve)
                            let taskCompletion = 0
                            if (subTasks.length > 0) {
                                const rawSum = subTasks.reduce((s, st) => s + (st.completionPercentage || 0), 0)
                                taskCompletion = rawSum / subTasks.length
                            }
                            return sum + (t.duration * taskCompletion)
                        }, 0)
                        calculatedProgress = weightedSum / totalDuration
                    }
                }

                // Get previous values
                const prevItem = previousItemsMap.get(article.id)
                // We trust the previous quantity stored in DB
                const previousQuantity = prevItem ? prevItem.totalQuantity : 0
                // Recalculate previous amount to ensure consistency with Unit Price
                const previousAmount = previousQuantity * article.unitPrice
                const previousPercentage = prevItem ? prevItem.totalPercentage : 0

                // Current (Total)
                // 1. Calculate raw quantity from progress
                let rawTotalQuantity = (article.quantity * calculatedProgress) / 100
                // 2. Round according to settings
                let totalQuantity = roundQty(rawTotalQuantity)

                // CLAMPING: Ensure we never go below previous invoiced quantity
                if (totalQuantity < previousQuantity) {
                    totalQuantity = previousQuantity
                }

                // Recalculate percentage based on rounded quantity for consistency
                const totalPercentage = article.quantity > 0
                    ? parseFloat(((totalQuantity / article.quantity) * 100).toFixed(2))
                    : 0

                // 3. Calculate Total Amount based on Rounded Quantity
                const totalAmount = totalQuantity * article.unitPrice

                // Current Period (Delta)
                // 4. Calculate Current (Monthly) values
                const currentQuantity = roundQty(totalQuantity - previousQuantity)
                const currentAmount = currentQuantity * article.unitPrice // Ensures Amount = Quantity * Price
                const currentPercentage = parseFloat((totalPercentage - previousPercentage).toFixed(2))

                invoiceItemsData.push({
                    articleId: article.id,
                    designation: article.designation,
                    unit: article.unit,
                    unitPrice: article.unitPrice,
                    marketQuantity: article.quantity,
                    previousQuantity,
                    currentQuantity,
                    totalQuantity,
                    previousPercentage,
                    currentPercentage,
                    totalPercentage,
                    previousAmount,
                    currentAmount, // This is now aligned with rounded quantity
                    totalAmount
                })

                totalInvoiceAmount += currentAmount // Summing period amounts for the Invoice Total
            }
        }

        // 4. Create Invoice and Items transactionally
        const newInvoice = await prisma.invoice.create({
            data: {
                projectId: params.id,
                number,
                date: new Date(date),
                periodStart: periodStart ? new Date(periodStart) : null,
                periodEnd: periodEnd ? new Date(periodEnd) : null,
                status: 'DRAFT',
                totalAmount: totalInvoiceAmount,
                items: {
                    create: invoiceItemsData
                }
            }
        })

        return NextResponse.json(newInvoice)

    } catch (error: any) {
        console.error("Create Invoice Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
