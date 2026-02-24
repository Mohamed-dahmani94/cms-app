import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const { id } = await params
        const body = await req.json()
        const { number, date, periodStart, periodEnd, progressAmount, retentionAmount, taxAmount, totalAmount, status, items } = body

        // Validate required fields
        if (!number || progressAmount === undefined || totalAmount === undefined) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        // Verify subcontract existence and permissions
        const subcontract = await prisma.subcontract.findUnique({
            where: { id }
        })

        if (!subcontract) {
            return new NextResponse("Subcontract not found", { status: 404 })
        }

        // Basic RBAC
        const isAdmin = session.user.role === "ADMIN"
        const isPM = session.user.role === "PROJECT_MANAGER"
        const isOwner = session.user.role === "SUBCONTRACTOR" && subcontract.subcontractorId === session.user.id

        if (!isAdmin && !isPM && !isOwner) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const result = await prisma.$transaction(async (tx) => {
            const bill = await tx.subcontractorBill.create({
                data: {
                    number,
                    date: new Date(date || Date.now()),
                    status: status || "DRAFT",
                    periodStart: periodStart ? new Date(periodStart) : null,
                    periodEnd: periodEnd ? new Date(periodEnd) : null,
                    progressAmount: parseFloat(progressAmount),
                    retentionAmount: parseFloat(retentionAmount || 0),
                    taxAmount: parseFloat(taxAmount || 0),
                    totalAmount: parseFloat(totalAmount),
                    subcontractId: id
                }
            })

            // Process Items if present
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    await tx.subcontractorBillItem.create({
                        data: {
                            billId: bill.id,
                            subcontractItemId: item.subcontractItemId,
                            previousPercentage: parseFloat(item.previousPercentage || 0),
                            currentPercentage: parseFloat(item.currentPercentage || 0),
                            totalPercentage: parseFloat(item.totalPercentage || 0),
                            previousAmount: parseFloat(item.previousAmount || 0),
                            currentAmount: parseFloat(item.currentAmount || 0),
                            totalAmount: parseFloat(item.totalAmount || 0)
                        }
                    })
                }
            }

            return bill
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Error creating subcontractor bill:", error)
        return NextResponse.json({ error: "Internal Error: " + error.message }, { status: 500 })
    }
}
