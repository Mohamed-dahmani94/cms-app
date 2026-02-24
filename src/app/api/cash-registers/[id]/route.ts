import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single cash register with transactions
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const register = await prisma.cashRegister.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { date: "desc" } },
      },
    })
    if (!register) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(register)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cash register" }, { status: 500 })
  }
}

// PATCH update cash register
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const register = await prisma.cashRegister.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(register)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update cash register" }, { status: 500 })
  }
}

// DELETE cash register
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.cashRegister.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete cash register" }, { status: 500 })
  }
}
