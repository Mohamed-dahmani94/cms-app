import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { fromRegisterId, toRegisterId, amount, description, category, userId } = body

    if (!fromRegisterId || !toRegisterId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid transfer parameters" }, { status: 400 })
    }

    if (fromRegisterId === toRegisterId) {
      return NextResponse.json({ error: "Cannot transfer to the same register" }, { status: 400 })
    }

    const txNumberOut = `TRX-OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const txNumberIn = `TRX-IN-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Use a transaction to ensure both registers are updated atomically
    const [outTx, inTx] = await prisma.$transaction([
      prisma.cashTransaction.create({
        data: {
          number: txNumberOut,
          type: "OUT",
          amount: parseFloat(amount),
          description: description || "Transfert sortant",
          category: category || "Transfert",
          reference: `TRF-TO-${toRegisterId.substring(0, 8)}`,
          registerId: fromRegisterId,
          createdById: userId || null,
        },
      }),
      prisma.cashRegister.update({
        where: { id: fromRegisterId },
        data: { balance: { decrement: parseFloat(amount) } },
      }),
      prisma.cashTransaction.create({
        data: {
          number: txNumberIn,
          type: "IN",
          amount: parseFloat(amount),
          description: description || "Transfert entrant",
          category: category || "Transfert",
          reference: `TRF-FROM-${fromRegisterId.substring(0, 8)}`,
          registerId: toRegisterId,
          createdById: userId || null,
        },
      }),
      prisma.cashRegister.update({
        where: { id: toRegisterId },
        data: { balance: { increment: parseFloat(amount) } },
      }),
    ])

    return NextResponse.json({ success: true, outTx, inTx }, { status: 201 })
  } catch (error) {
    console.error("Error creating transfer:", error)
    return NextResponse.json({ error: "Failed to create transfer" }, { status: 500 })
  }
}
