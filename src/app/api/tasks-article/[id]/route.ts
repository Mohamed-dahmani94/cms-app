import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH: Update task
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
        const { designation, duration, completionPercentage } = body

        const updateData: any = {}
        if (designation !== undefined) updateData.designation = designation
        if (duration !== undefined) {
            const newDuration = parseFloat(duration)

            // Check if new duration is less than sum of subtasks
            const subtasks = await prisma.articleSubTask.findMany({
                where: { taskId: params.id }
            })
            const totalSubtasksDuration = subtasks.reduce((sum, s) => sum + s.duration, 0)

            // Constraint: Task Duration >= Sum(Subtasks)
            if (newDuration < totalSubtasksDuration) {
                // Determine behavior: The user asked "aux min la some des jour".
                // If admin tries to set LESS, we clamp it to the SUM.
                updateData.duration = totalSubtasksDuration
            } else {
                updateData.duration = newDuration
            }
        }
        if (completionPercentage !== undefined) updateData.completionPercentage = parseFloat(completionPercentage)

        const task = await prisma.articleTask.update({
            where: { id: params.id },
            data: updateData
        })

        return NextResponse.json(task)

    } catch (error: any) {
        console.error("[TASK_PATCH] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to update task: ${error.message}` },
            { status: 500 }
        )
    }
}

// POST: Add subtask to task
export async function POST(
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
        const { code, designation, duration, isReserve } = body

        // Generate code
        let generatedCode = code
        if (!generatedCode) {
            if (isReserve) {
                const reserveCount = await prisma.articleSubTask.count({
                    where: { taskId: params.id, isReserve: true }
                })
                generatedCode = `RES-${(reserveCount + 1).toString().padStart(2, '0')}`
            } else {
                const totalCount = await prisma.articleSubTask.count({
                    where: { taskId: params.id }
                })
                generatedCode = `ST${(totalCount + 1).toString().padStart(2, '0')}`
            }
        }

        const subtask = await prisma.articleSubTask.create({
            data: {
                taskId: params.id,
                code: generatedCode,
                designation: designation || "Nouvelle sous-tâche",
                duration: duration || 1,
                completionPercentage: 0,
                isReserve: isReserve || false
            }
        })

        // Check constraint on parent Task (auto-extend if needed)
        const allSubtasks = await prisma.articleSubTask.findMany({
            where: { taskId: params.id }
        })
        const totalSubtasksDuration = allSubtasks.reduce((sum, s) => sum + s.duration, 0)

        const parentTask = await prisma.articleTask.findUnique({
            where: { id: params.id }
        })

        if (parentTask && totalSubtasksDuration > parentTask.duration) {
            await prisma.articleTask.update({
                where: { id: params.id },
                data: { duration: totalSubtasksDuration }
            })
        }

        return NextResponse.json(subtask)

    } catch (error: any) {
        console.error("[TASK_POST_SUBTASK] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to add subtask: ${error.message}` },
            { status: 500 }
        )
    }
}

// GET: Get task with subtasks
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

        const task = await prisma.articleTask.findUnique({
            where: { id: params.id },
            include: {
                subTasks: true,
                article: true
            }
        })

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        return NextResponse.json(task)

    } catch (error: any) {
        console.error("[TASK_GET] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to get task: ${error.message}` },
            { status: 500 }
        )
    }
}
