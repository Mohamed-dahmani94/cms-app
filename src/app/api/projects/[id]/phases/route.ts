import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET phases for a project
export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        console.log("[PHASES_GET] Step 1: Starting");
        const params = await props.params;
        console.log("[PHASES_GET] Step 2: Params resolved", params);

        const session = await getServerSession(authOptions)
        console.log("[PHASES_GET] Step 3: Session retrieved", session?.user?.email);

        if (!session) {
            console.log("[PHASES_GET] No session, returning 401");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        console.log("[PHASES_GET] Step 4: Querying database for project", params.id);
        const phases = await prisma.projectPhase.findMany({
            where: { projectId: params.id },
            orderBy: { startDate: 'asc' },
            include: {
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        startDate: true,
                        dueDate: true,
                        subtasks: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                startDate: true,
                                dueDate: true
                            }
                        }
                    }
                }
            }
        })
        console.log("[PHASES_GET] Step 5: Query successful, found", phases.length, "phases");
        return NextResponse.json(phases)
    } catch (error: any) {
        console.error("[PHASES_GET] ERROR:", error);
        console.error("[PHASES_GET] ERROR Stack:", error.stack);
        return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 })
    }
}

// POST new phase
export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { name, startDate, endDate } = body

        const phase = await prisma.projectPhase.create({
            data: {
                name,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                projectId: params.id
            }
        })
        return NextResponse.json(phase)
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 })
    }
}
