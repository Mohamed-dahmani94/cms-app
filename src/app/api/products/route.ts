import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all products
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const lowStock = searchParams.get("lowStock")

    const where: any = {}
    if (category) where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ]
    }

    const products = await prisma.product.findMany({
      where,
      include: { supplier: true },
      orderBy: { name: "asc" },
    })

    // Filter low stock in JS (SQLite doesn't support column-to-column comparison in where)
    const result = lowStock === "true"
      ? products.filter(p => p.currentStock <= p.minStock)
      : products

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

// POST create product
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, code, description, unit, category, minStock, currentStock, unitPrice, supplierId } = body

    if (!name || !code || !unit) {
      return NextResponse.json({ error: "Name, code, and unit are required" }, { status: 400 })
    }

    // Ensure numeric values are numbers
    const safeMinStock = minStock ? parseFloat(minStock) : 0
    const safeCurrentStock = currentStock ? parseFloat(currentStock) : 0
    const safeUnitPrice = unitPrice ? parseFloat(unitPrice) : 0

    const product = await prisma.product.create({
      data: {
        name,
        code,
        description: description || null,
        unit,
        category: category || null,
        minStock: isNaN(safeMinStock) ? 0 : safeMinStock,
        currentStock: isNaN(safeCurrentStock) ? 0 : safeCurrentStock,
        unitPrice: isNaN(safeUnitPrice) ? 0 : safeUnitPrice,
        supplierId: supplierId || null,
      },
      include: { supplier: true },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error("Error creating product:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Product code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create product", details: error.message }, { status: 500 })
  }
}
