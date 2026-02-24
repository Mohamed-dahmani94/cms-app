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

        const subcontract = await prisma.subcontract.findUnique({
            where: { id },
            include: {
                subcontractor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        // Exclude sensitive data
                    }
                },
                items: {
                    include: {
                        task: true // Include linked operational task
                    }
                },
                project: {
                    select: {
                        name: true,
                        currencyUnit: true
                    }
                },
                tasks: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                bills: {
                    include: {
                        items: true
                    },
                    orderBy: {
                        date: 'desc'
                    }
                }
            }
        })

        if (!subcontract) {
            return new NextResponse("Not Found", { status: 404 })
        }

        // Check permissions: Admin, PM, or the Subcontractor owner
        const isAdmin = session.user.role === "ADMIN"
        const isPM = session.user.role === "PROJECT_MANAGER"
        const isOwner = session.user.role === "SUBCONTRACTOR" && subcontract.subcontractorId === session.user.id

        if (!isAdmin && !isPM && !isOwner) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        return NextResponse.json(subcontract)
    } catch (error) {
        console.error("Error fetching subcontract:", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
