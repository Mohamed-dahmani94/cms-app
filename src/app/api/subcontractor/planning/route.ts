
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    // Ensure user is subcontractor or admin
    if (session.user.role !== "SUBCONTRACTOR" && session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const userId = session.user.id

        // Fetch tasks assigned to this subcontractor via Subcontract
        // OR directly assigned? The prompt focused on Subcontract model.

        // Find all subcontracts for this user
        const subcontracts = await prisma.subcontract.findMany({
            where: { subcontractorId: userId },
            include: {
                tasks: true
            }
        })

        // Flat map tasks
        const tasks = subcontracts.flatMap(s => s.tasks)

        // Map to Gantt format if needed, or return raw tasks
        // Front-end expects certain format.

        return NextResponse.json(tasks)
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
