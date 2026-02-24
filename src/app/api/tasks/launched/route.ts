import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Get all launched articles with their tasks and subtasks
export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        // Get all articles that have been launched (have realStartDate)
        const launchedArticles = await prisma.marketArticle.findMany({
            where: {
                realStartDate: { not: null }
            },
            include: {
                lot: {
                    include: {
                        market: {
                            include: {
                                project: true
                            }
                        }
                    }
                },
                tasks: {
                    include: {
                        subTasks: true
                    }
                }
            },
            orderBy: {
                realStartDate: 'desc'
            }
        })

        // Transform data to include project info at article level
        const result = launchedArticles.map(article => ({
            id: article.id,
            code: article.code,
            designation: article.designation,
            realStartDate: article.realStartDate,
            realEndDate: article.realEndDate,
            pvStatus: article.pvStatus, // Add PV status
            isClosed: article.isClosed,
            tasks: article.tasks.map(task => ({
                id: task.id,
                code: task.code,
                designation: task.designation,
                duration: task.duration,
                subTasks: task.subTasks.map(st => ({
                    id: st.id,
                    code: st.code,
                    designation: st.designation,
                    duration: st.duration,
                    completionPercentage: st.completionPercentage || 0,
                    engineerEmail: st.engineerEmail,
                    isReserve: st.isReserve // Add isReserve flag
                }))
            })),
            lot: {
                code: article.lot.code,
                name: article.lot.name
            },
            project: article.lot?.market?.project ? {
                id: article.lot.market.project.id,
                name: article.lot.market.project.name
            } : null
        }))

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("[TASKS_LAUNCHED_GET]", error)
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}
