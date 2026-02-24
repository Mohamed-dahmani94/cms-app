import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Calculate Project Production data
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

        const projectId = params.id

        // 1. Calculate weighted progress from ArticleTasks (via SubTasks)
        // Fetch all market articles with their tasks AND subtasks
        const market = await prisma.market.findUnique({
            where: { projectId },
            include: {
                lots: {
                    include: {
                        articles: {
                            include: {
                                tasks: {
                                    include: {
                                        subTasks: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!market) {
            return NextResponse.json({
                productionCost: 0,
                totalMarketAmount: 0,
                progressPercentage: 0
            })
        }

        let totalMarketAmount = 0
        let totalProductionCost = 0

        market.lots.forEach(lot => {
            lot.articles.forEach(article => {
                totalMarketAmount += article.totalAmount

                // Calculate Article Progress from its Tasks (which get progress from SubTasks)
                let articleProgress = 0

                if (article.tasks.length > 0) {
                    const totalArticleDuration = article.tasks.reduce((sum, t) => sum + t.duration, 0)

                    if (totalArticleDuration > 0) {
                        const weightedTaskProgressSum = article.tasks.reduce((sum, t) => {
                            // Calculate Task Progress from SubTasks
                            let taskCompletion = 0
                            // Filter out reserves from calculation if we only want 'work' progress
                            const subTasks = (t.subTasks || []).filter(st => !st.isReserve)

                            if (subTasks.length > 0) {
                                // Subtasks have 'completionPercentage'
                                // We can average them. Or if user defined 'weight', use it.
                                // For now, simple average of completionPercentage is standard unless weights are strict.
                                // Actually schema has 'weight' on subtasks!

                                const totalWeight = subTasks.reduce((s, st) => s + (st.weight || 0), 0)
                                const totalWeightedScore = subTasks.reduce((s, st) => s + ((st.completionPercentage || 0) * (st.weight || 0)), 0)

                                if (totalWeight > 0) {
                                    taskCompletion = totalWeightedScore / totalWeight
                                } else {
                                    // Fallback to simple average if weights are 0/missing
                                    const rawSum = subTasks.reduce((s, st) => s + (st.completionPercentage || 0), 0)
                                    taskCompletion = rawSum / subTasks.length
                                }
                            }

                            return sum + (t.duration * taskCompletion)
                        }, 0)

                        articleProgress = weightedTaskProgressSum / totalArticleDuration
                    }
                }

                // Production Cost for this article
                const earnedValue = article.totalAmount * (articleProgress / 100)
                totalProductionCost += earnedValue
            })
        })

        const globalProgress = totalMarketAmount > 0 ? (totalProductionCost / totalMarketAmount) * 100 : 0

        // 2. Calculate Billing History (Cumulative)
        const invoices = await prisma.invoice.findMany({
            where: {
                projectId,
                status: { in: ['VALIDATED', 'ACCOUNTED'] }
            },
            orderBy: { date: 'asc' },
            select: {
                date: true,
                totalAmount: true
            }
        })

        let cumulativeBilling = 0
        const billingHistory = invoices.map(inv => {
            cumulativeBilling += inv.totalAmount
            return {
                date: inv.date.toISOString().split('T')[0],
                amount: cumulativeBilling,
                type: 'Facturé'
            }
        })

        // 3. Calculate Planned Trend (Linear from Start to End) (Optional, useful for chart)
        // We need project start/end dates.
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { startDate: true, endDate: true }
        })

        const plannedTrend = []
        if (project?.startDate && project?.endDate && totalMarketAmount > 0) {
            plannedTrend.push({
                date: project.startDate.toISOString().split('T')[0],
                amount: 0,
                type: 'Prévu'
            })
            plannedTrend.push({
                date: project.endDate.toISOString().split('T')[0],
                amount: totalMarketAmount,
                type: 'Prévu'
            })
        }

        // 4. Calculate Estimated Production (Theoretical - Linear) for Today
        let estimatedProduction = 0
        if (project?.startDate && project?.endDate && totalMarketAmount > 0) {
            const start = project.startDate.getTime()
            const end = project.endDate.getTime()
            const now = new Date().getTime()

            if (now >= end) {
                estimatedProduction = totalMarketAmount
            } else if (now > start) {
                const totalDuration = end - start
                const elapsed = now - start
                estimatedProduction = (elapsed / totalDuration) * totalMarketAmount
            }
        }

        return NextResponse.json({
            productionCost: totalProductionCost,
            totalMarketAmount: totalMarketAmount,
            totalBilled: cumulativeBilling, // Return total billed amount
            estimatedProduction, // Return estimated production
            progressPercentage: globalProgress,
            billingHistory,
            plannedTrend
        })

    } catch (error: any) {
        console.error("[PROJECT_STATS_GET] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to calculate stats: ${error.message}` },
            { status: 500 }
        )
    }
}
