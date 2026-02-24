import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST: Create a new Market Article
export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const projectId = params.id
        const body = await request.json()
        const { lotId, code, designation, unit, quantity, unitPrice, amendmentId } = body

        if (!lotId || !code || !designation || !unit || quantity === undefined || unitPrice === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const quantityNum = parseFloat(quantity)
        const unitPriceNum = parseFloat(unitPrice)
        const totalAmount = quantityNum * unitPriceNum

        const newArticle = await prisma.marketArticle.create({
            data: {
                lotId,
                code,
                designation,
                unit,
                quantity: quantityNum,
                unitPrice: unitPriceNum,
                totalAmount,
                amendmentId: amendmentId || null
            }
        })

        // We should also create a corresponding ProjectPhase for this article so it appears in planning?
        // In the import logic, we likely create phases.
        // Let's create a phase automatically for this article to ensure consistency.

        // Find existing phase number to increment? 
        // For now, let's keep it simple and just create the article. 
        // If the user wants to plan it, they might need to "sync" or we create a phase now.
        // The schema says: phaseId String? @unique.

        // Let's CREATE the phase to be safe, otherwise it won't show in Gantt.
        // But what start/end date? Default to project start?
        const project = await prisma.project.findUnique({ where: { id: projectId } })

        if (project) {
            const phase = await prisma.projectPhase.create({
                data: {
                    projectId,
                    name: `${code} - ${designation}`,
                    startDate: project.startDate || new Date(),
                    endDate: project.startDate || new Date(),
                    status: "PLANNED"
                }
            })

            // Link phase to article
            await prisma.marketArticle.update({
                where: { id: newArticle.id },
                data: { phaseId: phase.id }
            })
        }

        return NextResponse.json(newArticle)

    } catch (error: any) {
        console.error("[ARTICLE_POST] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to create article: ${error.message}` },
            { status: 500 }
        )
    }
}
