import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "PROJECT_MANAGER")) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const {
            name,
            projectId,
            subcontractorId,
            startDate,
            endDate,
            retentionGuarantee,
            items // Array of { marketArticleId, description, unit, unitPrice, quantity, isCustom, ... }
        } = body

        if (!name || !projectId || !subcontractorId || !items) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        // Safe number parsing helper
        const safeFloat = (val: any) => {
            const parsed = parseFloat(val)
            return isNaN(parsed) ? 0 : parsed
        }

        // Calculate initial total
        const totalAmount = items.reduce((acc: number, item: any) => 
            acc + (safeFloat(item.unitPrice) * safeFloat(item.quantity)), 0
        )

        // Start Transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Subcontract
            const subcontract = await tx.subcontract.create({
                data: {
                    name,
                    projectId,
                    subcontractorId,
                    retentionGuarantee: safeFloat(retentionGuarantee || "10"),
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    status: "ACTIVE",
                    totalAmount
                }
            })

            // Track amendment/lot to avoid re-querying or duplicates
            let sharedAmendmentId: string | null = null
            let sharedLotId: string | null = null

            // 2. Process Items
            for (const item of items) {
                let marketArticleId = item.marketArticleId

                if (item.isCustom) {
                    // Logic for Custom Item: Create/Find Amendment -> Create Article
                    if (!sharedAmendmentId) {
                        let amendment = await tx.amendment.findFirst({
                            where: {
                                market: { projectId },
                                number: "Avenant Auto (Sous-traitance)"
                            }
                        })

                        if (!amendment) {
                            // Create Amendment
                            const market = await tx.market.findUnique({ where: { projectId } })
                            if (market) {
                                amendment = await tx.amendment.create({
                                    data: {
                                        marketId: market.id,
                                        number: "Avenant Auto (Sous-traitance)",
                                        status: "VALIDATED"
                                    }
                                })
                            }
                        }
                        if (amendment) sharedAmendmentId = amendment.id
                    }

                    if (sharedAmendmentId) {
                        if (!sharedLotId) {
                            let lot = await tx.marketLot.findFirst({
                                where: { marketId: sharedAmendmentId, name: "Travaux Supplémentaires" }
                            })

                            if (!lot) {
                                // Find market again to be safe subqueries aren't easy here
                                const amd = await tx.amendment.findUnique({
                                    where: { id: sharedAmendmentId }
                                })
                                if (amd) {
                                    lot = await tx.marketLot.create({
                                        data: {
                                            marketId: amd.marketId,
                                            name: "Travaux Supplémentaires",
                                            code: "LOT-SUP",
                                            order: 999
                                        }
                                    })
                                }
                            }
                            if (lot) sharedLotId = lot.id
                        }

                        if (sharedLotId) {
                            // Safely calculate amounts
                            const itemUP = safeFloat(item.unitPrice)
                            const itemQty = safeFloat(item.quantity)
                            
                            const article = await tx.marketArticle.create({
                                data: {
                                    lotId: sharedLotId,
                                    amendmentId: sharedAmendmentId,
                                    code: "ART-SUP-" + Date.now().toString().slice(-4) + Math.floor(Math.random() * 1000),
                                    designation: item.description,
                                    unit: item.unit,
                                    unitPrice: itemUP,
                                    quantity: itemQty,
                                    totalAmount: itemUP * itemQty
                                }
                            })
                            marketArticleId = article.id
                        }
                    }
                }

                // Safely calculate amounts
                const up = safeFloat(item.unitPrice)
                const qty = safeFloat(item.quantity)

                // 3. Create SubcontractItem
                const subItem = await tx.subcontractItem.create({
                    data: {
                        subcontractId: subcontract.id,
                        marketArticleId: marketArticleId,
                        description: item.description,
                        unit: item.unit,
                        unitPrice: up,
                        quantity: qty,
                        totalAmount: up * qty
                    }
                })

                // 4. Create Operational Task linked to this Item
                const task = await tx.task.create({
                    data: {
                        projectId,
                        title: item.description,
                        status: "PENDING",
                        subcontractId: subcontract.id,
                        subcontractItem: { connect: { id: subItem.id } },
                        assignedToId: subcontractorId,
                        startDate: subcontract.startDate,
                        dueDate: subcontract.endDate
                    }
                })

                // Update SubItem with TaskId
                await tx.subcontractItem.update({
                    where: { id: subItem.id },
                    data: { taskId: task.id }
                })
            }

            // 5. Fetch the complete subcontract with its relationships
            const completeSubcontract = await tx.subcontract.findUnique({
                where: { id: subcontract.id },
                include: {
                    items: true,
                    tasks: true
                }
            })

            return completeSubcontract
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Wizard Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
