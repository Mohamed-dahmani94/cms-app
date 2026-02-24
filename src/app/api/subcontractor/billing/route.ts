
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const userId = session.user.id

        // Get all subcontracts for this user
        const subcontracts = await prisma.subcontract.findMany({
            where: { subcontractorId: userId },
            include: {
                tasks: true,
                bills: {
                    orderBy: { date: 'desc' }
                }
            }
        })

        // Structure response
        const billingStatus = subcontracts.map(sc => {
            // Calculate total progress amount
            // Sum of (Task Price * Task Progress)
            const currentWorkAmount = sc.tasks.reduce((sum, task) => {
                const price = task.subcontractorPrice || 0
                const progress = task.progress || 0
                return sum + (price * (progress / 100))
            }, 0)

            const totalInvoiced = sc.bills
                .filter(b => b.status === 'VALIDATED' || b.status === "PAID")
                .reduce((sum, b) => sum + b.progressAmount, 0)

            return {
                subcontractId: sc.id,
                subcontractName: sc.name,
                totalContractAmount: sc.totalAmount,
                currentWorkAmount,
                totalInvoiced,
                remainderToBill: Math.max(0, currentWorkAmount - totalInvoiced),
                tasks: sc.tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    price: t.subcontractorPrice,
                    progress: t.progress
                }))
            }
        })

        return NextResponse.json(billingStatus)
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SUBCONTRACTOR") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { subcontractId } = body

        if (!subcontractId) return new NextResponse("Subcontract ID required", { status: 400 })

        // 1. Fetch Subcontract and Tasks
        const subcontract = await prisma.subcontract.findUnique({
            where: { id: subcontractId },
            include: { tasks: true, bills: true }
        })

        if (!subcontract) return new NextResponse("Subcontract not found", { status: 404 })
        if (subcontract.subcontractorId !== session.user.id) return new NextResponse("Forbidden", { status: 403 })

        // 2. Calculate Amounts
        const currentWorkAmount = subcontract.tasks.reduce((sum, task) => {
            const price = task.subcontractorPrice || 0
            const progress = task.progress || 0
            return sum + (price * (progress / 100))
        }, 0)

        const totalInvoiced = subcontract.bills
            .filter(b => b.status === 'VALIDATED' || b.status === "PAID" || b.status === "PENDING") // Include PENDING to prevent double request?
            .reduce((sum, b) => sum + b.progressAmount, 0)

        // Check if there is already a PENDING bill
        const definedPending = subcontract.bills.some(b => b.status === "PENDING")
        if (definedPending) {
            return new NextResponse("Vous avez déjà une situation en attente.", { status: 400 })
        }

        const amountToBill = currentWorkAmount - totalInvoiced

        if (amountToBill <= 0) {
            return new NextResponse("Aucun montant à facturer pour le moment.", { status: 400 })
        }

        // 3. Create Bill
        const bill = await prisma.subcontractorBill.create({
            data: {
                subcontractId: subcontract.id,
                progressAmount: amountToBill,
                status: "PENDING",
                date: new Date(),
                number: `SIT-${Date.now()}`, // Temp number logic
            }
        })

        return NextResponse.json(bill)

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
