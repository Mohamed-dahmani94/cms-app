import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { writeFile } from "fs/promises"
import path from "path"

// POST: Upload company logo
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get("logo") as File

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        // Validate file type
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"]
        if (!validTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed" },
                { status: 400 }
            )
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const extension = file.name.split('.').pop()
        const filename = `logo-${timestamp}.${extension}`

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Save to public/uploads/company/
        const uploadDir = path.join(process.cwd(), "public", "uploads", "company")
        const filepath = path.join(uploadDir, filename)

        await writeFile(filepath, buffer)

        // Return public URL
        const publicUrl = `/uploads/company/${filename}`

        return NextResponse.json({ url: publicUrl })

    } catch (error: any) {
        console.error("[LOGO_UPLOAD] ERROR:", error)
        return NextResponse.json(
            { error: `Failed to upload logo: ${error.message}` },
            { status: 500 }
        )
    }
}
