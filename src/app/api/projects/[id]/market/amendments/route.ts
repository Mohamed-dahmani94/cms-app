import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST: Create a new Amendment
export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const projectId = params.id
        const body = await request.json()
        const { number, date } = body

        if (!number) {
            return NextResponse.json({ error: "Amendment number is required" }, { status: 400 })
        }

        // Find the market for this project
        const market = await prisma.market.findUnique({
            where: { projectId: projectId }
        })

        if (!market) {
            return NextResponse.json({ error: "Market not found for this project" }, { status: 404 })
        }

        let newAmendment;
        try {
            newAmendment = await prisma.amendment.create({
                data: {
                    number,
                    date: date ? new Date(date) : new Date(),
                    marketId: market.id,
                    status: "DRAFT"
                }
            })
        } catch (error: any) {
            // Check if it's likely a stale client issue (prisma.amendment undefined or invalid)
            console.error("Prisma Create Error:", error)
            if (error.message && (error.message.includes("is not not a function") || error.message.includes("undefined"))) {
                return NextResponse.json(
                    { error: "Server update required. Please restart your dev server to enable Amendments." },
                    { status: 503 }
                )
            }
            throw error; // Re-throw for general handler
        }

        return NextResponse.json(newAmendment)

    } catch (error: any) {
        console.error("[AMENDMENT_POST] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to create amendment: ${error.message}` },
            { status: 500 }
        )
    }
}
