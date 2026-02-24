import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "PROJECT_MANAGER")) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const { id } = await params

        const result = await prisma.$transaction(async (tx) => {
            // Fetch subcontract details
            const subcontract = await tx.subcontract.findUnique({
                where: { id },
                include: { tasks: true, items: true }
            })

            if (!subcontract) {
                throw new Error("Subcontract not found")
            }

            if (subcontract.items.length > 0) {
                return { message: "Already has items" }
            }

            // Find tasks with price
            const eligibleTasks = subcontract.tasks.filter(t => (t.subcontractorPrice || 0) > 0)

            if (eligibleTasks.length === 0) {
                throw new Error("No eligible tasks with prices found to migrate")
            }

            let createdCount = 0
            for (const task of eligibleTasks) {
                // Create Item
                const item = await tx.subcontractItem.create({
                    data: {
                        subcontractId: subcontract.id,
                        description: task.title,
                        unit: "Forfait",
                        unitPrice: task.subcontractorPrice || 0,
                        quantity: 1,
                        totalAmount: task.subcontractorPrice || 0,
                        taskId: task.id // Link back
                    }
                })
                createdCount++

                // Update Task to link to item
                await tx.task.update({
                    where: { id: task.id },
                    data: { subcontractItem: { connect: { id: item.id } } }
                })
            }

            return { createdCount }
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Migration Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
