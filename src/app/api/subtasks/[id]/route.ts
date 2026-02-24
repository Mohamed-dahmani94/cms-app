import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH: Update subtask progress
// PATCH: Update subtask progress
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { designation, completionPercentage, engineerEmail, duration } = body

        // 1. Update the subtask
        const subtask = await prisma.articleSubTask.update({
            where: { id: params.id },
            data: {
                designation: designation !== undefined ? designation : undefined,
                completionPercentage: completionPercentage !== undefined ? parseFloat(completionPercentage) : undefined,
                engineerEmail: engineerEmail !== undefined ? engineerEmail : undefined,
                duration: duration !== undefined ? parseInt(duration) : undefined
            }
        })

        // 2. If duration changed, check constraint on parent Task
        if (duration !== undefined) {
            // Recalculate sum of all sibling subtasks
            const siblings = await prisma.articleSubTask.findMany({
                where: { taskId: subtask.taskId }
            })
            const totalSubtasksDuration = siblings.reduce((sum, s) => sum + s.duration, 0)

            // Fetch parent task
            const parentTask = await prisma.articleTask.findUnique({
                where: { id: subtask.taskId }
            })

            if (parentTask) {
                // If sum > parent duration, update parent duration
                if (totalSubtasksDuration > parentTask.duration) {
                    await prisma.articleTask.update({
                        where: { id: subtask.taskId },
                        data: { duration: totalSubtasksDuration }
                    })
                }
            }
        }

        return NextResponse.json(subtask)

    } catch (error: any) {
        console.error("[SUBTASK_PATCH] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to update subtask: ${error.message}` },
            { status: 500 }
        )
    }
}

// GET: Get subtask details
export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const subtask = await prisma.articleSubTask.findUnique({
            where: { id: params.id },
            include: {
                task: {
                    include: {
                        article: {
                            include: {
                                lot: true
                            }
                        }
                    }
                }
            }
        })

        if (!subtask) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 })
        }

        return NextResponse.json(subtask)

    } catch (error: any) {
        console.error("[SUBTASK_GET] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to get subtask: ${error.message}` },
            { status: 500 }
        )
    }
}
