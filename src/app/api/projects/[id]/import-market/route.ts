import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from 'xlsx'

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // DEBUG: Check available models
        console.log("[MARKET_IMPORT] Available Prisma Models:", Object.keys(prisma));
        if (!prisma.market) {
            console.error("[MARKET_IMPORT] CRITICAL: prisma.market is undefined! You must restart the dev server.");
        }

        // Get the uploaded file
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }

        // Read Excel file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: params.id }
        })

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Process sheets
        const summary = {
            projectUpdated: false,
            templatesCreated: 0,
            apartmentTypesCreated: 0,
            blocksCreated: 0,
            marketCreated: false,
            lotsCreated: 0,
            articlesCreated: 0,
            tasksCreated: 0,
            subTasksCreated: 0,
            progressRecordsCreated: 0,
            errors: [] as string[]
        }

        // Sheet 1: Configuration Projet
        if (workbook.SheetNames.includes('Configuration')) {
            try {
                await processConfigurationSheet(workbook, params.id, summary)
            } catch (error: any) {
                summary.errors.push(`Configuration: ${error.message}`)
            }
        }

        // Sheet 2: Structure Marché (tout regroupé)
        if (workbook.SheetNames.includes('Structure Marche')) {
            console.log("[MARKET_IMPORT] Found 'Structure Marche' sheet");
            try {
                await processStructureMarche(workbook, params.id, summary)
                console.log("[MARKET_IMPORT] Processed 'Structure Marche' sheet successfully");
            } catch (error: any) {
                console.error("[MARKET_IMPORT] Error processing 'Structure Marche':", error);
                summary.errors.push(`Structure Marché: ${error.message}`)
            }
        } else {
            console.warn("[MARKET_IMPORT] 'Structure Marche' sheet NOT found. Available sheets:", workbook.SheetNames);
        }

        return NextResponse.json({
            success: true,
            summary
        })

    } catch (error: any) {
        console.error("[MARKET_IMPORT] ERROR:", error)
        return NextResponse.json(
            { error: `Import failed: ${error.message}` },
            { status: 500 }
        )
    }
}

// Helper functions for processing each sheet
async function processConfigurationSheet(
    workbook: XLSX.WorkBook,
    projectId: string,
    summary: any
) {
    const sheet = workbook.Sheets['Configuration']
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    // Parse general info (Partie 1)
    const config: any = {}
    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        if (row[0] && row[1]) {
            const field = String(row[0]).trim()
            const value = row[1]

            if (field === 'Nom de projet') config.name = value
            else if (field === 'Description') config.description = value
            else if (field === 'Lieu') config.location = value
            else if (field === 'Client') config.client = value
            else if (field === 'Marché N°') config.marketNumber = value
            else if (field === 'Date Marché') config.marketDate = value
            else if (field === 'ODS N°') config.odsNumber = value
            else if (field === 'Date ODS') config.odsDate = value
            else if (field === 'Coût Estimé (Marché)') config.estimatedCost = parseFloat(value)
        }
    }

    // Update project
    await prisma.project.update({
        where: { id: projectId },
        data: {
            name: config.name || undefined,
            description: config.description || undefined,
            location: config.location || undefined,
            client: config.client || undefined,
            estimatedCost: config.estimatedCost || undefined
        }
    })
    summary.projectUpdated = true

    // Create or update Market (Always ensure market exists)
    await prisma.market.upsert({
        where: { projectId },
        create: {
            projectId,
            marketNumber: config.marketNumber || "N/A",
            marketDate: config.marketDate ? new Date(config.marketDate) : new Date(),
            odsNumber: config.odsNumber,
            odsDate: config.odsDate ? new Date(config.odsDate) : null,
            estimatedCost: config.estimatedCost || 0
        },
        update: {
            marketNumber: config.marketNumber || undefined,
            marketDate: config.marketDate ? new Date(config.marketDate) : undefined,
            odsNumber: config.odsNumber || undefined,
            odsDate: config.odsDate ? new Date(config.odsDate) : undefined,
            estimatedCost: config.estimatedCost || undefined
        }
    })
    summary.marketCreated = true

    // Parse templates (Partie 2)
    // Find where template table starts
    let templateStartRow = -1
    for (let i = 0; i < data.length; i++) {
        if (String(data[i][0]).includes('Gabarit')) {
            templateStartRow = i + 1
            break
        }
    }

    if (templateStartRow > 0) {
        const templates = new Map<string, any>()

        for (let i = templateStartRow; i < data.length; i++) {
            const row = data[i]
            if (!row[0]) break // End of table

            const gabarit = String(row[0]).trim()
            const blocksCount = parseInt(row[1]) || 0
            const blocksRange = String(row[2] || '').trim()
            const floors = parseInt(row[3]) || 0
            const aptType = String(row[4] || '').trim()
            const countPerFloor = parseInt(row[5]) || 0
            const totalCount = parseInt(row[6]) || 0

            // Create template if not exists
            if (!templates.has(gabarit)) {
                const template = await prisma.buildingTemplate.create({
                    data: {
                        name: gabarit,
                        numberOfFloors: floors,
                        projectId
                    }
                })
                templates.set(gabarit, template)
                summary.templatesCreated++
            }

            // Create apartment type
            const template = templates.get(gabarit)!
            await prisma.apartmentType.create({
                data: {
                    type: aptType,
                    countPerFloor,
                    totalCount,
                    templateId: template.id
                }
            })
            summary.apartmentTypesCreated++

            // Create blocks if range specified
            if (blocksRange && blocksRange !== '-') {
                const blocks = parseBlockRange(blocksRange)
                for (const blockName of blocks) {
                    const existing = await prisma.projectBlock.findFirst({
                        where: { projectId, name: blockName }
                    })

                    if (!existing) {
                        await prisma.projectBlock.create({
                            data: {
                                name: blockName,
                                code: blockName.replace('Bloc ', ''),
                                projectId,
                                templateId: template.id,
                                order: summary.blocksCreated
                            }
                        })
                        summary.blocksCreated++
                    }
                }
            }
        }
    }
}

// Process consolidated Structure Marche sheet
async function processStructureMarche(
    workbook: XLSX.WorkBook,
    projectId: string,
    summary: any
) {
    const sheet = workbook.Sheets['Structure Marche']
    let rawData = XLSX.utils.sheet_to_json(sheet) as any[]

    // Normalize headers: Trim keys and values, remove extra spaces
    const data = rawData.map(row => {
        const newRow: any = {}
        Object.keys(row).forEach(key => {
            const cleanKey = key.trim() // Keep original casing for now, but trim spaces
            newRow[cleanKey] = row[key]
        })
        return newRow
    })

    const market = await prisma.market.findUnique({
        where: { projectId }
    })

    if (!market) {
        throw new Error("Market not found. Process Configuration sheet first.")
    }

    const lots = new Map<string, any>()
    const articles = new Map<string, any>()
    const tasks = new Map<string, any>()

    const articleToPhaseId = new Map<string, string>()

    // Fill-down state
    let lastLotFull = ""
    let lastArticleCode = ""
    let lastArticleDesignation = ""
    let lastUnit = ""
    let lastUnitPrice = 0
    let lastQuantity = 0
    let lastTotalAmount = 0
    let lastPvRequired = false

    // Task fill-down
    let lastTaskCode = ""
    let lastTaskDesignation = ""
    let lastDuration = 1
    let lastWeight = 100
    let lastPriority = "MEDIUM"
    let lastEngineer = ""

    // Cost Accumulator
    let totalProjectCost = 0

    // Helper to get value safely (handling accents)
    const getVal = (row: any, keys: string[]) => {
        for (const key of keys) {
            if (row[key] !== undefined) return row[key]
        }
        return undefined
    }

    for (const row of data) {
        // ... (Parsing logic remains the same) ...
        // Parse LOT and Article info (with fill-down)
        let lotFull = String(getVal(row, ['LOT', 'Lot', 'lot']) || '').trim()
        if (!lotFull && lastLotFull) lotFull = lastLotFull
        else if (lotFull) lastLotFull = lotFull

        let articleCode = String(getVal(row, ['Article', 'article']) || '').trim()
        let articleDesignation = String(getVal(row, ['Désignation Article', 'Designation Article', 'Désignation', 'Designation']) || '').trim()
        let unit = String(getVal(row, ['Unité', 'Unite', 'Unit']) || '').trim()
        let unitPrice = parseFloat(getVal(row, ['Prix Unit. (DA)', 'Prix Unit', 'Prix']) || 0)
        let quantity = parseFloat(getVal(row, ['Quantité', 'Quantite', 'Qte']) || 0)
        let totalAmount = parseFloat(getVal(row, ['Montant Total', 'Montant']) || unitPrice * quantity)
        let pvRequiredStr = String(getVal(row, ['PV Requis', 'PV']) || '').toLowerCase()
        let pvRequired = pvRequiredStr === 'oui'

        if (!articleCode && lastArticleCode) {
            articleCode = lastArticleCode
            articleDesignation = lastArticleDesignation
            unit = lastUnit
            unitPrice = lastUnitPrice
            quantity = lastQuantity
            totalAmount = lastTotalAmount
            pvRequired = lastPvRequired
        } else if (articleCode) {
            lastArticleCode = articleCode
            lastArticleDesignation = articleDesignation
            lastUnit = unit
            lastUnitPrice = unitPrice
            lastQuantity = quantity
            lastTotalAmount = totalAmount
            lastPvRequired = pvRequired
        }

        // Parse Task info (with fill-down)
        let taskCode = String(getVal(row, ['Tâche', 'Tache', 'Task']) || '').trim()
        let subTaskCode = String(getVal(row, ['Sous-Tâche', 'Sous-Tache', 'SubTask']) || '').trim()
        // Default SubTask code if missing but Task exists
        if (taskCode && !subTaskCode) {
            subTaskCode = "ST-01"
        }

        let taskDesignation = String(getVal(row, ['Désignation Tâche', 'Designation Tache', 'Task Name']) || '').trim()
        let duration = parseInt(getVal(row, ['Durée (j)', 'Duree (j)', 'Duration']) || 1)
        let weight = parseFloat(getVal(row, ['Poids (%)', 'Weight']) || 100)
        let priority = String(getVal(row, ['Priorité', 'Priorite', 'Priority']) || 'MEDIUM').toUpperCase()
        let engineer = String(getVal(row, ['Ingénieur', 'Ingenieur', 'Engineer']) || '').trim()

        if (!taskCode && lastTaskCode) {
            taskCode = lastTaskCode
            taskDesignation = lastTaskDesignation
            duration = lastDuration
            weight = lastWeight
            priority = lastPriority
            engineer = lastEngineer
            if (!subTaskCode) subTaskCode = "ST-01"
        } else if (taskCode) {
            lastTaskCode = taskCode
            lastTaskDesignation = taskDesignation
            lastDuration = duration
            lastWeight = weight
            lastPriority = priority
            lastEngineer = engineer
        }

        // Parse Application info
        const blocksSpec = String(getVal(row, ['Appliquer Blocs', 'Blocs']) || '').trim()
        const floorsSpec = String(getVal(row, ['Appliquer Étages', 'Etages']) || '').trim()
        const offset = parseInt(getVal(row, ['Offset (j)', 'Offset']) || 0)

        // Create LOT if new
        if (lotFull && !lots.has(lotFull)) {
            const lotCode = lotFull.split(' - ')[0].trim()
            const lotName = lotFull.split(' - ')[1]?.trim() || ''
            const lot = await prisma.marketLot.create({
                data: {
                    code: lotCode,
                    name: lotName,
                    marketId: market.id,
                    order: lots.size
                }
            })
            lots.set(lotFull, lot)
            summary.lotsCreated++
        }

        // Create Article if new
        if (articleCode && !articles.has(articleCode)) {
            // Use the filled-down lotFull from the outer scope
            const lot = lots.get(lotFull)
            if (lot) {
                const article = await prisma.marketArticle.create({
                    data: {
                        code: articleCode,
                        designation: articleDesignation,
                        unit,
                        unitPrice,
                        quantity,
                        totalAmount,
                        pvRequired,
                        lotId: lot.id
                    }
                })
                articles.set(articleCode, article)
                summary.articlesCreated++

                // Accumulate Cost
                totalProjectCost += totalAmount

                // SYNC: Create corresponding Project Phase
                const phase = await prisma.projectPhase.create({
                    data: {
                        name: `${articleCode} - ${articleDesignation}`,
                        projectId: projectId,
                        status: 'PENDING',
                        startDate: market.odsDate || undefined // Default to ODS date
                    }
                })
                articleToPhaseId.set(articleCode, phase.id)
            } else {
                console.warn(`[IMPORT_WARNING] Lot not found for Article ${articleCode}: ${lotFull}. Available Lots: ${Array.from(lots.keys())}`);
            }
        }

        // Create Task if new
        if (taskCode) {
            const article = articles.get(articleCode)
            if (article) {
                const taskKey = `${articleCode}-${taskCode}`

                // Create task if not exists
                if (!tasks.has(taskKey)) {
                    console.log(`[IMPORT_ACTION] Creating Task: ${taskCode}`);
                    const task = await prisma.articleTask.create({
                        data: {
                            code: taskCode,
                            designation: taskDesignation,
                            duration,
                            priority,
                            articleId: article.id
                        }
                    })
                    tasks.set(taskKey, task)
                    summary.tasksCreated++

                    // SYNC: Create corresponding Project Task
                    const phaseId = articleToPhaseId.get(articleCode)
                    if (phaseId) {
                        console.log(`[IMPORT_ACTION] Creating Project Task: ${taskDesignation}`);
                        await prisma.task.create({
                            data: {
                                title: taskDesignation,
                                status: 'PENDING',
                                priority: priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW' ? priority : 'MEDIUM',
                                phaseId: phaseId,
                                projectId: projectId,
                                startDate: market.odsDate || undefined // Default to ODS date
                            }
                        })
                    } else {
                        console.warn(`[IMPORT_WARNING] Phase not found for Task ${taskCode} (Article ${articleCode}). Map keys: ${Array.from(articleToPhaseId.keys())}`);
                    }
                }

                // Create subtask ONLY if subTaskCode exists
                if (subTaskCode) {
                    const task = tasks.get(taskKey)!
                    // Check if subtask already exists to avoid duplicates (though usually unique per row)
                    // For now, assuming one row = one subtask. 
                    // But if we have multiple rows for same subtask (e.g. for progress), we might need checks.
                    // Given the structure, let's just create it.

                    await prisma.articleSubTask.create({
                        data: {
                            code: subTaskCode,
                            designation: taskDesignation, // Or maybe we should have a specific subtask designation column? Using Task designation for now as per previous logic.
                            duration,
                            weight,
                            engineerEmail: engineer || null,
                            taskId: task.id
                        }
                    })
                    summary.subTasksCreated++
                }
            } else {
                console.warn(`[IMPORT_WARNING] Article not found for Task ${taskCode}: ${articleCode}. Available Articles: ${Array.from(articles.keys())}`);
            }
        }

        // Create progress records (only for first subtask of each article to avoid duplicates)
        if (blocksSpec && subTaskCode === 'ST01') {
            const article = articles.get(articleCode)
            if (article) {
                const blocks = await parseBlocksSpec(blocksSpec, projectId)
                const floors = parseFloorsSpec(floorsSpec)

                for (const block of blocks) {
                    if (floors.length === 0) {
                        await prisma.blockArticleProgress.create({
                            data: {
                                blockId: block.id,
                                articleId: article.id,
                                floorNumber: null,
                                pvRequired: article.pvRequired
                            }
                        })
                        summary.progressRecordsCreated++
                    } else {
                        for (const floor of floors) {
                            await prisma.blockArticleProgress.create({
                                data: {
                                    blockId: block.id,
                                    articleId: article.id,
                                    floorNumber: floor,
                                    pvRequired: article.pvRequired
                                }
                            })
                            summary.progressRecordsCreated++
                        }
                    }
                }
            }
        }
    }

    // Update Project Estimated Cost
    if (totalProjectCost > 0) {
        await prisma.project.update({
            where: { id: projectId },
            data: { estimatedCost: totalProjectCost }
        })
        console.log(`[IMPORT_SUCCESS] Updated Project Estimated Cost: ${totalProjectCost}`);
    }

    return NextResponse.json(summary)
}

async function processProgressSheet(
    workbook: XLSX.WorkBook,
    projectId: string,
    summary: any
) {
    // TODO: Implement progress import if Sheet 5 is provided
    // This would update existing BlockArticleProgress records
}

// Helper functions
function parseBlockRange(range: string): string[] {
    // "Bloc A-H" → ["Bloc A", "Bloc B", ..., "Bloc H"]
    // "Bloc A, Bloc B" → ["Bloc A", "Bloc B"]

    if (range.includes(',')) {
        return range.split(',').map(b => b.trim())
    }

    if (range.includes('-')) {
        const match = range.match(/Bloc ([A-Z])-([A-Z])/)
        if (match) {
            const start = match[1].charCodeAt(0)
            const end = match[2].charCodeAt(0)
            const blocks = []
            for (let i = start; i <= end; i++) {
                blocks.push(`Bloc ${String.fromCharCode(i)}`)
            }
            return blocks
        }
    }

    return [range]
}

async function parseBlocksSpec(spec: string, projectId: string) {
    if (spec.toUpperCase() === 'ALL') {
        return await prisma.projectBlock.findMany({
            where: { projectId }
        })
    }

    const blockNames = parseBlockRange(spec)
    return await prisma.projectBlock.findMany({
        where: {
            projectId,
            name: { in: blockNames }
        }
    })
}

function parseFloorsSpec(spec: string): number[] {
    if (!spec || spec === '-') return []
    if (spec.toUpperCase() === 'ALL') {
        // Return 0-9 (RDC + 9 floors) - adjust based on template
        return Array.from({ length: 10 }, (_, i) => i)
    }
    if (spec === 'RDC') return [0]

    if (spec.includes('-')) {
        const [start, end] = spec.split('-').map(s => parseInt(s.trim()))
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }

    return [parseInt(spec)]
}
