import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH update phase
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, startDate, endDate, status, completionPercentage } = body

        const phase = await prisma.projectPhase.update({
            where: { id: params.id },
            data: {
                name,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status,
                // New field
                ...(completionPercentage !== undefined && { completionPercentage: Number(completionPercentage) })
            }
        })
        return NextResponse.json(phase)
    } catch (error: any) {
        return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 })
    }
}

// DELETE phase
export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        await prisma.projectPhase.delete({
            where: { id: params.id }
        })
        return new NextResponse(null, { status: 204 })
    } catch (error: any) {
        return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 })
    }
}
