import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single supplier
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        products: true,
        purchases: { orderBy: { date: "desc" }, take: 10 },
      },
    })
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    return NextResponse.json(supplier)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 })
  }
}

// PATCH update supplier
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const supplier = await prisma.supplier.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(supplier)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 })
  }
}

// DELETE supplier
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.supplier.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 })
  }
}
