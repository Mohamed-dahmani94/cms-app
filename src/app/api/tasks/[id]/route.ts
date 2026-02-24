import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const { id } = await params

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                phase: true,
                assignedTo: true,
                project: true
            }
        })

        if (!task) {
            return new NextResponse("Not Found", { status: 404 })
        }

        return NextResponse.json(task)
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

export async function PATCH(
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
        const {
            status, pvFileUrl, siteImageUrl, title, startDate, dueDate,
            subcontractId, subcontractorPrice, progress,
            gpsLatitude, gpsLongitude
        } = body

        // Verify ownership or admin status
        const existingTask = await prisma.task.findUnique({
            where: { id },
            include: { ArticleTask: { include: { article: true } } }
        })

        if (!existingTask) {
            return new NextResponse("Not Found", { status: 404 })
        }

        const isSubcontractor = session.user.role === "SUBCONTRACTOR"
        const isAssignedSubcontractor = existingTask.subcontractId && isSubcontractor // We should ideally check if subcontract.subcontractorId === session.user.id

        if (session.user.role !== "ADMIN" && existingTask.assignedToId !== session.user.id && !isAssignedSubcontractor) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // Logic for Subcontractor Assignment (Admin only)
        if (subcontractId !== undefined && session.user.role === "ADMIN") {
            // If assigning to a subcontract, we might want to also assign to the subcontractor user?
            // For now, let's just link the subcontract.
        }

        let updateData: any = {}
        if (status) updateData.status = status
        if (title) updateData.title = title
        if (startDate) updateData.startDate = new Date(startDate)
        if (dueDate) updateData.dueDate = new Date(dueDate)

        // Subcontracting fields
        if (subcontractId) updateData.subcontractId = subcontractId
        if (subcontractorPrice !== undefined) updateData.subcontractorPrice = parseFloat(subcontractorPrice)
        if (progress !== undefined) updateData.progress = parseInt(progress)

        // Evidence
        if (pvFileUrl) updateData.pvFileUrl = pvFileUrl
        if (siteImageUrl) updateData.siteImageUrl = siteImageUrl
        if (gpsLatitude) updateData.gpsLatitude = gpsLatitude
        if (gpsLongitude) updateData.gpsLongitude = gpsLongitude

        if (status === "PRELIMINARY_DONE") {
            updateData.preliminaryDoneAt = new Date()
        } else if (status === "FINAL_DONE") {
            // Check required fields
            if (!updateData.pvFileUrl && !existingTask.pvFileUrl) {
                // Not enforcing strictly for now based on user flow variations
            }
            updateData.finalDoneAt = new Date()
            updateData.progress = 100 // Force 100%
        } else if (status === "IN_PROGRESS") {
            // If just starting, maybe set realStartDate? 
            if (!existingTask.startDate) updateData.startDate = new Date() // Set start date if not set
        }

        const task = await prisma.task.update({
            where: { id },
            data: updateData
        })

        // TRIGGER AGGREGATION
        // If progress or status changed, we need to update Market Article -> Block -> Project
        if (progress !== undefined || status === "FINAL_DONE") {
            const newProgress = progress !== undefined ? parseInt(progress) : 100
            // Run in background to avoid blocking response
            import("@/lib/progress-service").then(({ recalculateProgress }) => {
                recalculateProgress(id, newProgress)
            })
        }

        return NextResponse.json(task)
    } catch (error) {
        console.error("Task update error:", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
