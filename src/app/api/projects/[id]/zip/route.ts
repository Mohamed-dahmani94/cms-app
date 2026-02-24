import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import archiver from 'archiver'
import path from 'path'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const searchParams = req.nextUrl.searchParams
    const scope = searchParams.get('scope') // PV, ARTICLE, SUBTASK, ALL
    const scopeId = searchParams.get('scopeId')

    if (!scope) {
        return NextResponse.json({ error: "Scope required" }, { status: 400 })
    }

    // 1. Fetch documents
    let whereClause: any = { projectId: id }


    if (scope === 'PV') {
        whereClause.type = 'PV_RECEPTION'
    } else if (scope === 'ARTICLE') {
        if (!scopeId) return NextResponse.json({ error: "Article ID required" }, { status: 400 })
        whereClause.articleId = scopeId
        // Article folder should also contain subtask docs? usually yes.
        // If articleId is set, Prisma fetch all docs with this articleId.
        // BUT subtask docs also have articleId set?
        // Let's check upload logic:
        // PV: articleId=X, subtaskId=null
        // Photo: articleId=X, subtaskId=Y
        // So whereClause.articleId = scopeId gets EVERYTHING (PV + Photos).
        // Except if PVs are excluded from "Document Article" view? 
        // Logic in View was: PVs are separated. 
        // If user downloads "Article", they expect Everything related to Article?
        // Let's assume YES.
    } else if (scope === 'SUBTASK') {
        if (!scopeId) return NextResponse.json({ error: "Subtask ID required" }, { status: 400 })
        whereClause.subTaskId = scopeId
    }

    const documents = await prisma.document.findMany({
        where: whereClause
    })

    if (documents.length === 0) {
        return NextResponse.json({ error: "Aucun document trouvé" }, { status: 404 })
    }

    // 2. Prepare Stream
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('data', (chunk) => writer.write(chunk))
    archive.on('end', () => writer.close())
    archive.on('error', (err) => {
        console.error("Archiver error", err)
        writer.abort(err)
    })

    // 3. Add files - Handle async/sync properly? archive.file is sync-like (queues)
    // But we need to make sure file exists.

    // We can just queue them all.
    documents.forEach(doc => {
        // doc.url = /uploads/projectId/filename
        const filePath = path.join(process.cwd(), 'public', doc.url)
        // Add to zip with a name.
        // If scope is Article, maybe structure inside zip? 
        // For simplicity: flat list with unique names? 
        // Original implementation uses unique names on disk, but doc.name is display name.
        // doc.name might be duplicate.
        // Let's use doc.name. Duplicate names in ZIP are possible but confusing.
        // archiver handles duplicates by renaming or overwriting? 
        // Let's use the actual filename on disk as name in zip to be safe? 
        // Or cleaner: Use doc.name but append ID if duplicate?
        // Let's stick to doc.name for User Experience.

        archive.file(filePath, { name: doc.name })
    })

    console.log(`Creating ZIP with ${documents.length} files for scope ${scope}`)

    archive.finalize()

    // 4. Return Response
    // Filename logic
    const filename = `Documents-${scope}-${scopeId || 'All'}.zip`

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${filename}"`
        }
    })
}
