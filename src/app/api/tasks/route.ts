import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    try {
        const where = projectId ? { projectId } : {}

        const tasks = await prisma.task.findMany({
            where,
            include: {
                project: true,
                ArticleTask: {
                    include: {
                        article: {
                            include: {
                                lot: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(tasks)
    } catch (error: any) {
        console.error("[TASKS_GET]", error)
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { title, description, projectId, phaseId, status, priority, startDate, dueDate, parentTaskId } = body

        const task = await prisma.task.create({
            data: {
                title,
                description,
                projectId,
                phaseId,
                status: status || "PENDING",
                priority: priority || "MEDIUM",
                startDate: startDate ? new Date(startDate) : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                parentTaskId
            }
        })

        return NextResponse.json(task)
    } catch (error: any) {
        console.error("[TASK_POST]", error)
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}
