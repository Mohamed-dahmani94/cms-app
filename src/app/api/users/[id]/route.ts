import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                specialty: true
            }
        })

        return NextResponse.json(user)
    } catch (error: any) {
        console.error("[USER_GET]", error)
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}

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
        const { name, email, role, specialty } = body

        const user = await prisma.user.update({
            where: { id: params.id },
            data: {
                name,
                email,
                role,
                specialty
            }
        })

        const { password: _, ...userWithoutPassword } = user
        return NextResponse.json(userWithoutPassword)
    } catch (error: any) {
        console.error("[USER_PATCH]", error)
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}
