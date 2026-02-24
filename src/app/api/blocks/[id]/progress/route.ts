import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Get progress for a specific block
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

        const progress = await prisma.blockArticleProgress.findMany({
            where: { blockId: params.id },
            include: {
                article: {
                    include: {
                        lot: true,
                        tasks: {
                            include: {
                                subTasks: true
                            }
                        }
                    }
                },
                block: true
            },
            orderBy: [
                { floorNumber: 'asc' },
                { article: { code: 'asc' } }
            ]
        })

        // Calculate aggregated statistics
        const totalAmount = progress.reduce((sum, p) => sum + p.completedAmount, 0)
        const totalPVRequired = progress.filter(p => p.pvRequired).length
        const totalPVUploaded = progress.filter(p => p.pvUploaded).length

        return NextResponse.json({
            progress,
            summary: {
                totalRecords: progress.length,
                totalAmount,
                pvRequired: totalPVRequired,
                pvUploaded: totalPVUploaded,
                pvPending: totalPVRequired - totalPVUploaded
            }
        })

    } catch (error: any) {
        console.error("[BLOCK_PROGRESS_GET] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to retrieve progress: ${error.message}` },
            { status: 500 }
        )
    }
}

// PATCH: Update progress for block/article/floor
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
        const { articleId, floorNumber, subTaskProgress, pvDocumentUrl } = body

        // Find the progress record
        const progressRecord = await prisma.blockArticleProgress.findFirst({
            where: {
                blockId: params.id,
                articleId,
                floorNumber: floorNumber === undefined ? null : floorNumber
            },
            include: {
                article: {
                    include: {
                        tasks: {
                            include: {
                                subTasks: true
                            }
                        }
                    }
                }
            }
        })

        if (!progressRecord) {
            return NextResponse.json({ error: "Progress record not found" }, { status: 404 })
        }

        // Update subtask completion percentages if provided
        if (subTaskProgress && Array.isArray(subTaskProgress)) {
            for (const update of subTaskProgress) {
                await prisma.articleSubTask.update({
                    where: { id: update.subTaskId },
                    data: { completionPercentage: update.percentage }
                })
            }
        }

        // Recalculate article completion percentage using weighted average
        const article = progressRecord.article
        let totalWeightedCompletion = 0
        let totalTasks = 0

        for (const task of article.tasks) {
            const subTasks = task.subTasks
            if (subTasks.length === 0) continue

            // Calculate weighted average for this task
            const totalWeight = subTasks.reduce((sum, st) => sum + st.weight, 0)
            const weightedSum = subTasks.reduce((sum, st) =>
                sum + (st.completionPercentage * st.weight), 0
            )
            const taskCompletion = totalWeight > 0 ? weightedSum / totalWeight : 0

            totalWeightedCompletion += taskCompletion
            totalTasks++
        }

        const articleCompletion = totalTasks > 0 ? totalWeightedCompletion / totalTasks : 0
        const completedAmount = (articleCompletion / 100) * article.totalAmount

        // Update progress record
        const updated = await prisma.blockArticleProgress.update({
            where: { id: progressRecord.id },
            data: {
                completionPercentage: articleCompletion,
                completedAmount,
                pvUploaded: pvDocumentUrl ? true : progressRecord.pvUploaded,
                pvDocumentUrl: pvDocumentUrl || progressRecord.pvDocumentUrl
            }
        })

        return NextResponse.json(updated)

    } catch (error: any) {
        console.error("[BLOCK_PROGRESS_PATCH] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to update progress: ${error.message}` },
            { status: 500 }
        )
    }
}
