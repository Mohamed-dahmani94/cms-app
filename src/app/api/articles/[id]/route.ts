import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH: Update article dates
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)

        console.log("[ARTICLE_PATCH] Session:", session?.user?.email)
        console.log("[ARTICLE_PATCH] Article ID:", params.id)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        console.log("[ARTICLE_PATCH] Body:", body)

        const {
            startDate, endDate, realStartDate, realEndDate,
            pvStatus, pvDate, pvFileUrl,
            isClosed, reopen
        } = body

        // Build update data object dynamically
        const updateData: any = {}
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
        if (realStartDate !== undefined) updateData.realStartDate = realStartDate ? new Date(realStartDate) : null
        if (realEndDate !== undefined) updateData.realEndDate = realEndDate ? new Date(realEndDate) : null

        // PV fields
        if (pvStatus !== undefined) updateData.pvStatus = pvStatus
        if (pvDate !== undefined) updateData.pvDate = pvDate ? new Date(pvDate) : null
        if (pvFileUrl !== undefined) updateData.pvFileUrl = pvFileUrl

        // Closure handling
        if (isClosed !== undefined) {
            updateData.isClosed = isClosed
            if (isClosed) {
                updateData.closedAt = new Date()
                updateData.closedBy = session.user.email
                updateData.realEndDate = new Date() // Set real end date when closing
            }
        }

        // Reopen (admin only)
        if (reopen && session.user.role === 'ADMIN') {
            updateData.isClosed = false
            updateData.closedAt = null
            updateData.closedBy = null
            updateData.pvStatus = null
            updateData.pvDate = null
        }

        console.log("[ARTICLE_PATCH] Update data:", updateData)

        const article = await prisma.marketArticle.update({
            where: { id: params.id },
            data: updateData
        })

        console.log("[ARTICLE_PATCH] Success:", article.id)
        return NextResponse.json(article)

    } catch (error: any) {
        console.error("[ARTICLE_PATCH] ERROR:", error.message)
        console.error("[ARTICLE_PATCH] STACK:", error.stack)
        return NextResponse.json(
            { error: `Failed to update article: ${error.message}` },
            { status: 500 }
        )
    }
}

// GET: Get article details
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

        const article = await prisma.marketArticle.findUnique({
            where: { id: params.id },
            include: {
                tasks: {
                    include: {
                        subTasks: true
                    }
                },
                lot: true
            }
        })

        if (!article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 })
        }

        return NextResponse.json(article)

    } catch (error: any) {
        console.error("[ARTICLE_GET] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to get article: ${error.message}` },
            { status: 500 }
        )
    }
}
