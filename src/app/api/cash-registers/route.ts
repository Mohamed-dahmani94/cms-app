import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all cash registers
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") // PROJECT, USER
    const projectId = searchParams.get("projectId")
    const userId = searchParams.get("userId")

    const where: any = {}
    if (type) where.type = type
    if (projectId) where.projectId = projectId
    if (userId) where.userId = userId

    const registers = await prisma.cashRegister.findMany({
      where,
      include: {
        transactions: { orderBy: { date: "desc" }, take: 5 },
        _count: { select: { transactions: true } },
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(registers)
  } catch (error) {
    console.error("Error fetching cash registers:", error)
    return NextResponse.json({ error: "Failed to fetch cash registers" }, { status: 500 })
  }
}

// POST create cash register
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, type, projectId, userId, balance } = body

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
    }

    const register = await prisma.cashRegister.create({
      data: {
        name,
        type,
        projectId: projectId || null,
        userId: userId || null,
        balance: balance || 0,
      },
    })
    return NextResponse.json(register, { status: 201 })
  } catch (error) {
    console.error("Error creating cash register:", error)
    return NextResponse.json({ error: "Failed to create cash register" }, { status: 500 })
  }
}
