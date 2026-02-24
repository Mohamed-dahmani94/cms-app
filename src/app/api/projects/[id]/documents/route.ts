import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// GET documents for a project
export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const documents = await prisma.document.findMany({
            where: { projectId: params.id },
            include: {
                article: true,
                subTask: true
            },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(documents)
    } catch (error: any) {
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}

// POST new document (supports both JSON and FormData file uploads)
export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const contentType = request.headers.get('content-type') || ''

        // Handle FormData file upload
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            const file = formData.get('file') as File
            const subtaskId = formData.get('subtaskId') as string
            const articleId = formData.get('articleId') as string
            const category = formData.get('category') as string || 'PHOTO'

            if (!file) {
                return new NextResponse("No file provided", { status: 400 })
            }

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads', params.id)
            console.log("[DOCUMENTS_POST] Creating directory:", uploadsDir)
            await mkdir(uploadsDir, { recursive: true })

            // Generate unique filename
            let filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

            if (category === 'PV_RECEPTION' && articleId) {
                const article = await prisma.marketArticle.findUnique({
                    where: { id: articleId },
                    include: { lot: true }
                })

                if (article) {
                    const dateStr = new Date().toISOString().split('T')[0]
                    const ext = path.extname(file.name)
                    // Format: Pv-Reception-LotXX-ARTYY-YYYY-MM-DD_Timestamp.ext
                    filename = `Pv-Reception-Lot${article.lot.code}-ART${article.code}-${dateStr}_${Date.now()}${ext}`
                }
            } else if (subtaskId) {
                // Handle renaming for subtask photos/documents
                const subtask = await prisma.articleSubTask.findUnique({
                    where: { id: subtaskId },
                    include: {
                        task: {
                            include: {
                                article: {
                                    include: { lot: true }
                                }
                            }
                        }
                    }
                })

                if (subtask && subtask.task && subtask.task.article) {
                    const article = subtask.task.article
                    const lot = article.lot
                    const dateStr = new Date().toISOString().split('T')[0]
                    const ext = path.extname(file.name)
                    // Format: Photo-LotXX-ARTYY-taskZZZ-date
                    // Using subtask code if available, otherwise simplified name
                    const taskCode = subtask.code || 'ST'
                    filename = `Photo-Lot${lot.code}-ART${article.code}-${taskCode}-${dateStr}_${Date.now()}${ext}`
                }
            }

            const filepath = path.join(uploadsDir, filename)

            console.log("[DOCUMENTS_POST] Writing file to:", filepath)

            // Save file to disk
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)
            await writeFile(filepath, buffer)

            console.log("[DOCUMENTS_POST] File written successfully")

            // Create document record in database
            const document = await prisma.document.create({
                data: {
                    name: file.name,
                    type: category, // Keep using type for backward compat or simplicity
                    url: `/uploads/${params.id}/${filename}`,
                    projectId: params.id,
                    articleId: articleId || undefined,
                    subTaskId: subtaskId || undefined
                }
            })

            return NextResponse.json(document)
        }

        // Handle JSON body (original behavior)
        const body = await request.json()
        const { name, type, url } = body

        const document = await prisma.document.create({
            data: {
                name,
                type,
                url,
                projectId: params.id
            }
        })
        return NextResponse.json(document)
    } catch (error: any) {
        console.error("[DOCUMENTS_POST] ERROR:", error)
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}
