import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const projects = await prisma.project.findMany({
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(projects)
    } catch (error) {
        console.error("[PROJECTS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { name, description, location, startDate, endDate, client, estimatedCost } = body

        const project = await prisma.project.create({
            data: {
                name,
                description,
                location,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                client,
                estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined
            }
        })

        return NextResponse.json(project)
    } catch (error) {
        console.error("[PROJECTS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
