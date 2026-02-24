import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all suppliers
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: { _count: { select: { products: true, purchases: true } } },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(suppliers)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 })
  }
}

// POST create supplier
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, phone, address, email, nif, rc } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: { name, phone, address, email, nif, rc },
    })
    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Failed to create supplier", details: error.message }, { status: 500 })
  }
}
