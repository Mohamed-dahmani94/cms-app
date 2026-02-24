import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        // Fetch all users for assignment (include all)
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                specialty: true
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error("[USERS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

import bcrypt from "bcryptjs"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { name, email, password, role, specialty } = body

        if (!name || !email || !password || !role) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return new NextResponse("User already exists", { status: 409 })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                specialty
            }
        })

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        console.error("[USERS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
