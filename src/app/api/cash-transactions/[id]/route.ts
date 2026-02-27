import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single cash transaction
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const transaction = await prisma.cashTransaction.findUnique({
      where: { id },
      include: { register: true, createdBy: true, updatedBy: true },
    })
    if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(transaction)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 })
  }
}

// PATCH update cash transaction
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { amount, description, category, reference, updatedById } = body

    // We only allow updating these operational fields.
    // To update register or type safely, we'd need more complex logic.
    
    // First, find the original transaction to handle balance updates if amount changed
    const originalTx = await prisma.cashTransaction.findUnique({ where: { id } })
    if (!originalTx) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let amountDiff = 0
    if (amount !== undefined && amount !== originalTx.amount) {
      amountDiff = amount - originalTx.amount
    }

    const updates = []
    
    // Update the transaction
    updates.push(prisma.cashTransaction.update({
      where: { id },
      data: {
        amount: amount !== undefined ? amount : originalTx.amount,
        description: description !== undefined ? description : originalTx.description,
        category: category !== undefined ? category : originalTx.category,
        reference: reference !== undefined ? reference : originalTx.reference,
        updatedById: updatedById || originalTx.updatedById,
      },
      include: { register: true, updatedBy: true }
    }))

    // If amount changed, update the register balance
    if (amountDiff !== 0) {
      const balanceChange = originalTx.type === "IN" ? amountDiff : -amountDiff
      updates.push(prisma.cashRegister.update({
        where: { id: originalTx.registerId },
        data: { balance: { increment: balanceChange } },
      }))
    }

    // Execute transaction safely
    const results = await prisma.$transaction(updates)
    
    return NextResponse.json(results[0])
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
  }
}

// DELETE cash transaction
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Find before deleting to adjust register balance
    const originalTx = await prisma.cashTransaction.findUnique({ where: { id } })
    if (!originalTx) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Reverse the balance application
    const balanceChange = originalTx.type === "IN" ? -originalTx.amount : originalTx.amount

    const [deleted] = await prisma.$transaction([
      prisma.cashTransaction.delete({ where: { id } }),
      prisma.cashRegister.update({
        where: { id: originalTx.registerId },
        data: { balance: { increment: balanceChange } },
      })
    ])

    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
