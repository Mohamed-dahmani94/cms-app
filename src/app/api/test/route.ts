import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const count = await prisma.project.count()
        return NextResponse.json({ success: true, projectCount: count })
    } catch (error: any) {
        console.error("Test API Error:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}
