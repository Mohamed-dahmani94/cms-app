import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE document
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
        await prisma.document.delete({
            where: { id: params.id }
        })
        return new NextResponse(null, { status: 204 })
    } catch (error: any) {
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}
