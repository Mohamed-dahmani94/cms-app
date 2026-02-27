import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all cash transactions
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const registerId = searchParams.get("registerId")
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = {}
    if (registerId) where.registerId = registerId
    if (type) where.type = type
    if (category) where.category = category

    const transactions = await prisma.cashTransaction.findMany({
      where,
      include: { register: true, createdBy: true, updatedBy: true },
      orderBy: { date: "desc" },
      take: limit,
    })
    return NextResponse.json(transactions)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

// POST create cash transaction
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, amount, description, category, registerId, reference, userId } = body

    if (!type || !amount || !description || !registerId) {
      return NextResponse.json({ error: "Type, amount, description, and register are required" }, { status: 400 })
    }

    // Create transaction and update register balance in transaction
    const balanceChange = type === "IN" ? amount : -amount
    const txNumber = `TRX-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const [transaction] = await prisma.$transaction([
      prisma.cashTransaction.create({
        data: {
          number: txNumber,
          type,
          amount,
          description,
          category: category || null,
          reference: reference || null,
          registerId,
          createdById: userId || null,
        },
        include: { register: true, createdBy: true },
      }),
      prisma.cashRegister.update({
        where: { id: registerId },
        data: { balance: { increment: balanceChange } },
      }),
    ])

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}
