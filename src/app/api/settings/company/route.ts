import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Retrieve company settings
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get first (and should be only) company settings record
        let settings = await prisma.companySettings.findFirst()

        // If no settings exist, return default values
        if (!settings) {
            settings = {
                id: "",
                companyName: "",
                slogan: null,
                nif: null,
                rc: null,
                nis: null,
                stats: null,
                address: null,
                city: null,
                postalCode: null,
                phone: null,
                email: null,
                website: null,
                logoUrl: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }

        return NextResponse.json(settings)

    } catch (error: any) {
        console.error("[COMPANY_SETTINGS_GET] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to get company settings: ${error.message}` },
            { status: 500 }
        )
    }
}

// PUT: Update company settings
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 })
        }

        const body = await request.json()
        const {
            companyName,
            slogan,
            nif,
            rc,
            nis,
            stats,
            address,
            city,
            postalCode,
            phone,
            email,
            website,
            logoUrl
        } = body

        // Validation
        if (!companyName || companyName.trim() === "") {
            return NextResponse.json({ error: "Company name is required" }, { status: 400 })
        }

        // Get existing settings ID or create new
        const existing = await prisma.companySettings.findFirst()

        let settings
        if (existing) {
            // Update existing
            settings = await prisma.companySettings.update({
                where: { id: existing.id },
                data: {
                    companyName,
                    slogan,
                    nif,
                    rc,
                    nis,
                    stats,
                    address,
                    city,
                    postalCode,
                    phone,
                    email,
                    website,
                    logoUrl
                }
            })
        } else {
            // Create new
            settings = await prisma.companySettings.create({
                data: {
                    companyName,
                    slogan,
                    nif,
                    rc,
                    nis,
                    stats,
                    address,
                    city,
                    postalCode,
                    phone,
                    email,
                    website,
                    logoUrl
                }
            })
        }

        return NextResponse.json(settings)

    } catch (error: any) {
        console.error("[COMPANY_SETTINGS_PUT] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to update company settings: ${error.message}` },
            { status: 500 }
        )
    }
}
