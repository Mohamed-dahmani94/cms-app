import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return new NextResponse("Unauthorized: No session found", { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
        console.log(`Unauthorized Access Attempt. User: ${session.user.email}, Role: ${userRole}`)
        return new NextResponse(`Unauthorized: Role '${userRole}' is not allowed to create subcontracts. Required: ADMIN or PROJECT_MANAGER`, { status: 401 })
    }

    try {
        const body = await req.json()
        const { name, totalAmount, subcontractorId, projectId, startDate, endDate, retentionGuarantee } = body

        if (!name || !subcontractorId || !projectId) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        const parsedTotal = parseFloat(totalAmount)
        const parsedRetention = parseFloat(retentionGuarantee || "10")

        if (isNaN(parsedTotal)) {
            return new NextResponse("Invalid Total Amount", { status: 400 })
        }

        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate) : null

        if ((startDate && isNaN(start!.getTime())) || (endDate && isNaN(end!.getTime()))) {
            return new NextResponse("Invalid Date Format", { status: 400 })
        }

        const subcontract = await prisma.subcontract.create({
            data: {
                name,
                totalAmount: parsedTotal,
                retentionGuarantee: isNaN(parsedRetention) ? 10 : parsedRetention,
                subcontractorId,
                projectId,
                startDate: start,
                endDate: end,
                status: "ACTIVE"
            }
        })

        return NextResponse.json(subcontract)
    } catch (error: any) {
        console.error("Subcontract create error:", error)
        return NextResponse.json({ error: "Internal Error: " + error.message }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    try {
        const whereClause: any = {}
        if (projectId) whereClause.projectId = projectId

        // If user is Subcontractor, only show their contracts
        if (session.user.role === "SUBCONTRACTOR") {
            whereClause.subcontractorId = session.user.id
        }

        const subcontracts = await prisma.subcontract.findMany({
            where: whereClause,
            include: {
                subcontractor: {
                    select: { name: true, email: true }
                },
                tasks: true
            }
        })

        return NextResponse.json(subcontracts)
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
