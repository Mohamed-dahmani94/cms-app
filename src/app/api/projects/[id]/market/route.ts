import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Retrieve complete market structure
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

        let market: any = null

        try {
            // Try fetching with new schema (including amendments)
            market = await prisma.market.findUnique({
                where: { projectId: params.id },
                include: {
                    amendments: {
                        include: {
                            articles: true
                        }
                    },
                    lots: {
                        include: {
                            articles: {
                                include: {
                                    tasks: {
                                        include: {
                                            subTasks: true
                                        }
                                    },
                                    blockProgress: {
                                        include: {
                                            block: true
                                        }
                                    },
                                    invoiceItems: {
                                        where: {
                                            invoice: {
                                                status: { in: ['VALIDATED', 'ACCOUNTED'] }
                                            }
                                        },
                                        select: {
                                            totalPercentage: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: { order: 'asc' }
                    }
                }
            })
        } catch (e) {
            console.warn("Failed to fetch with amendments (likely stale Prisma Client), falling back to basic query.")
            // Fallback: Fetch without amendments (stale client compatibility)
            market = await prisma.market.findUnique({
                where: { projectId: params.id },
                include: {
                    lots: {
                        include: {
                            articles: {
                                include: {
                                    tasks: {
                                        include: {
                                            subTasks: true
                                        }
                                    },
                                    blockProgress: {
                                        include: {
                                            block: true
                                        }
                                    },
                                    invoiceItems: {
                                        where: {
                                            invoice: {
                                                status: { in: ['VALIDATED', 'ACCOUNTED'] }
                                            }
                                        },
                                        select: {
                                            totalPercentage: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: { order: 'asc' }
                    }
                }
            })
        }

        if (!market) {
            return NextResponse.json({ error: "Market not found" }, { status: 404 })
        }

        // Safe access to relations
        const marketAny = market as any
        const lots = marketAny.lots || []
        const amendments = marketAny.amendments || []

        // Calculate summary statistics
        const totalArticles = lots.reduce((sum: number, lot: any) => sum + (lot.articles?.length || 0), 0)
        const totalTasks = lots.reduce((sum: number, lot: any) =>
            sum + (lot.articles || []).reduce((s: number, a: any) => s + (a.tasks?.length || 0), 0), 0
        )
        const totalSubTasks = lots.reduce((sum: number, lot: any) =>
            sum + (lot.articles || []).reduce((s: number, a: any) =>
                s + (a.tasks || []).reduce((st: number, t: any) => st + (t.subTasks?.length || 0), 0), 0
            ), 0
        )

        const articlesWithPV = lots.reduce((sum: number, lot: any) =>
            sum + (lot.articles || []).filter((a: any) => a.pvRequired).length, 0
        )

        // Calculate total market amount broken down
        let baseCost = 0
        let amendmentCost = 0
        let totalCalculatedCost = 0

        lots.forEach((lot: any) => {
            (lot.articles || []).forEach((article: any) => {
                const amount = article.totalAmount || 0
                totalCalculatedCost += amount
                if (article.amendmentId) {
                    amendmentCost += amount
                } else {
                    baseCost += amount
                }
            })
        })

        // Ensure we include the correct linked amendments in the response if they were not part of the typed object
        // (Though the include should have put them there)

        return NextResponse.json({
            market: {
                ...market,
                lots,
                amendments
            },
            summary: {
                totalLots: lots.length,
                totalArticles,
                totalTasks,
                totalSubTasks,
                articlesWithPV,
                estimatedCost: totalCalculatedCost > 0 ? totalCalculatedCost : (market.estimatedCost || 0),
                baseCost,
                amendmentCost
            }
        })

    } catch (error: any) {
        console.error("[MARKET_GET] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to retrieve market: ${error.message}` },
            { status: 500 }
        )
    }
}

// PATCH: Update market details
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { marketNumber, marketDate, odsNumber, odsDate, estimatedCost } = body

        const market = await prisma.market.update({
            where: { projectId: params.id },
            data: {
                marketNumber: marketNumber || undefined,
                marketDate: marketDate ? new Date(marketDate) : undefined,
                odsNumber: odsNumber || undefined,
                odsDate: odsDate ? new Date(odsDate) : undefined,
                estimatedCost: estimatedCost || undefined
            }
        })

        return NextResponse.json(market)

    } catch (error: any) {
        console.error("[MARKET_PATCH] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to update market: ${error.message}` },
            { status: 500 }
        )
    }
}
