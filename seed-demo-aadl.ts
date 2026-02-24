
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting AADL Demo Seed...')

    // 1. CLEANUP
    console.log('Cleaning database...')
    await prisma.subcontractorBillItem.deleteMany()
    await prisma.subcontractorBill.deleteMany()
    await prisma.subcontractItem.deleteMany()
    await prisma.subcontract.deleteMany()
    await prisma.task.deleteMany()
    await prisma.invoiceItem.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.blockArticleProgress.deleteMany()
    await prisma.articleSubTask.deleteMany()
    await prisma.articleTask.deleteMany()
    await prisma.marketArticle.deleteMany()
    await prisma.marketLot.deleteMany()
    await prisma.amendment.deleteMany()
    await prisma.market.deleteMany()
    await prisma.projectBlock.deleteMany()
    await prisma.apartmentType.deleteMany()
    await prisma.buildingTemplate.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()

    // 2. USERS
    console.log('Creating users...')
    const password = await hash('password123', 12)

    const admin = await prisma.user.create({
        data: { email: 'admin@aadl.dz', name: 'Admin AADL', role: 'ADMIN', password }
    })

    const pm = await prisma.user.create({
        data: { email: 'chef@aadl.dz', name: 'Chef de Projet', role: 'PROJECT_MANAGER', password }
    })

    const subsData = [
        { name: 'Sarl Beton Express', specialty: 'Gros Oeuvre' },
        { name: 'Eurl Elec Pro', specialty: 'Electricité' },
        { name: 'Plomberie Moderne', specialty: 'Plomberie' },
        { name: 'Peinture & Finition', specialty: 'Peinture' },
    ]

    const subcontractors = []
    for (const s of subsData) {
        const sub = await prisma.user.create({
            data: {
                email: `contact@${s.name.replace(/\s+/g, '').toLowerCase()}.com`,
                name: s.name,
                role: 'SUBCONTRACTOR',
                specialty: s.specialty,
                password
            }
        })
        subcontractors.push(sub)
    }

    // 3. PROJECTS & MARKET
    const projectsData = [
        { name: '1500 Logements AADL Sidi Abdellah', loc: 'Sidi Abdellah, Alger' },
        { name: '500 Logements AADL Bouinan', loc: 'Bouinan, Blida' }
    ]

    for (const pData of projectsData) {
        console.log(`Creating Project: ${pData.name}...`)
        const project = await prisma.project.create({
            data: {
                name: pData.name,
                location: pData.loc,
                status: 'ACTIVE',
                billingMode: 'HT',
                currencyUnit: 'DZD',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2026-06-30')
            }
        })

        // Market Structure
        const market = await prisma.market.create({
            data: {
                marketNumber: `AADL/2024/${project.name.substring(0, 3)}`,
                marketDate: new Date('2023-12-15'),
                estimatedCost: 2500000000, // 2.5 Milliards
                projectId: project.id
            }
        })

        // Lots & Articles
        const lots = [
            {
                code: '01', name: 'Gros Oeuvre', articles: [
                    { code: '01.01', des: 'Terrassement en grande masse', u: 'm3', q: 5000, p: 800 },
                    { code: '01.02', des: 'Béton de propreté', u: 'm3', q: 200, p: 12000 },
                    { code: '01.03', des: 'Béton armé pour semelles', u: 'm3', q: 1500, p: 35000 },
                    { code: '01.04', des: 'Béton armé en élévation', u: 'm3', q: 8000, p: 38000 },
                ]
            },
            {
                code: '02', name: 'Maçonnerie', articles: [
                    { code: '02.01', des: 'Murs extérieurs dble paroi', u: 'm2', q: 12000, p: 4500 },
                    { code: '02.02', des: 'Cloisons intérieures', u: 'm2', q: 25000, p: 2200 },
                ]
            },
            {
                code: '03', name: 'Electricité', articles: [
                    { code: '03.01', des: 'Câblage filerie', u: 'ml', q: 50000, p: 150 },
                    { code: '03.02', des: 'Points lumineux', u: 'U', q: 2500, p: 1200 },
                    { code: '03.03', des: 'Prises de courant', u: 'U', q: 4000, p: 800 },
                ]
            },
            {
                code: '04', name: 'Plomberie', articles: [
                    { code: '04.01', des: 'Tuyauterie alimentation', u: 'ml', q: 8000, p: 450 },
                    { code: '04.02', des: 'Evacuations PVC', u: 'ml', q: 6000, p: 600 },
                ]
            }
        ]

        const allArticles = []

        for (const l of lots) {
            const lot = await prisma.marketLot.create({
                data: { code: l.code, name: l.name, marketId: market.id }
            })

            for (const a of l.articles) {
                const article = await prisma.marketArticle.create({
                    data: {
                        code: a.code, designation: a.des, unit: a.u,
                        unitPrice: a.p, quantity: a.q, totalAmount: a.p * a.q,
                        lotId: lot.id
                    }
                })
                allArticles.push({ ...article, type: l.name })
            }
        }


        // 4. MARKET TASKS & SUBTASKS (Detailed Planning)
        console.log(`  > Creating Detailed Tasks & Subtasks for ${pData.name}...`)
        for (const art of allArticles) {
            // Create 2 Tasks per Article
            const task1 = await prisma.articleTask.create({
                data: {
                    articleId: art.id,
                    code: 'T01',
                    designation: 'Préparation et Approvisionnement',
                    duration: 5,
                    subTasks: {
                        create: [
                            { code: 'ST01', designation: 'Nettoyage zone', weight: 40, duration: 2 },
                            { code: 'ST02', designation: 'Approvisionnement matériaux', weight: 60, duration: 3 }
                        ]
                    }
                }
            })
            const task2 = await prisma.articleTask.create({
                data: {
                    articleId: art.id,
                    code: 'T02',
                    designation: 'Mise en oeuvre',
                    duration: 10,
                    subTasks: {
                        create: [
                            { code: 'ST01', designation: 'Exécution première phase', weight: 50, duration: 5 },
                            { code: 'ST02', designation: 'Finition et Nettoyage', weight: 50, duration: 5 }
                        ]
                    }
                }
            })
        }

        // 5. CLIENT INVOICES (SITUATIONS)
        console.log(`  > Generating 3 Client Invoices for ${pData.name}...`)
        // Simulating 3 months of progress: 20%, 50%, 75%
        const progressSteps = [0.20, 0.50, 0.75]
        let prevTotalAmount = 0

        for (let i = 0; i < progressSteps.length; i++) {
            const cumulativeProgress = progressSteps[i]
            const invoiceDate = new Date('2024-03-30')
            invoiceDate.setMonth(invoiceDate.getMonth() + i)

            let invoiceTotalAmount = 0
            const invoiceItems = []

            for (const art of allArticles) {
                // Apply progress to article quantity
                const totalQty = art.quantity * cumulativeProgress
                const currentQty = totalQty - (art.quantity * (progressSteps[i - 1] || 0))

                const totalAmt = totalQty * art.unitPrice
                const currentAmt = currentQty * art.unitPrice
                const prevAmt = totalAmt - currentAmt

                // Clamp values
                if (currentQty <= 0) continue

                invoiceItems.push({
                    articleId: art.id,
                    designation: art.designation,
                    unit: art.unit,
                    unitPrice: art.unitPrice,
                    marketQuantity: art.quantity,

                    previousQuantity: totalQty - currentQty,
                    currentQuantity: currentQty,
                    totalQuantity: totalQty,

                    previousPercentage: (progressSteps[i - 1] || 0) * 100,
                    currentPercentage: (cumulativeProgress - (progressSteps[i - 1] || 0)) * 100,
                    totalPercentage: cumulativeProgress * 100,

                    previousAmount: prevAmt,
                    currentAmount: currentAmt,
                    totalAmount: totalAmt
                })

                invoiceTotalAmount += currentAmt
            }

            await prisma.invoice.create({
                data: {
                    projectId: project.id,
                    number: `SIT-${(i + 1).toString().padStart(2, '0')}`,
                    date: invoiceDate,
                    status: 'VALIDATED',
                    periodStart: new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), 1),
                    periodEnd: invoiceDate,
                    totalAmount: invoiceTotalAmount,
                    items: {
                        create: invoiceItems
                    }
                }
            })
        }

        // 6. SUBCONTRACTS & TASKS
        console.log(`  > Assigning Subcontractors & Bills for ${pData.name}...`)

        // Assign Gros Oeuvre to 'Sarl Beton Express'
        await createSubcontractFlow(project.id, subcontractors[0], allArticles.filter(a => a.type === 'Gros Oeuvre'), '01', 0.85) // 85% progress

        // Assign Electricité to 'Eurl Elec Pro'
        await createSubcontractFlow(project.id, subcontractors[1], allArticles.filter(a => a.type === 'Electricité'), '02', 0.67) // 67% progress

        // Assign Plomberie to 'Plomberie Moderne'
        await createSubcontractFlow(project.id, subcontractors[2], allArticles.filter(a => a.type === 'Plomberie'), '03', 0.40) // 40% progress

    } // end project loop

    console.log('✅ Seeding Complete!')
}

async function createSubcontractFlow(projectId: string, subcontractor: any, articles: any[], suffix: string, targetProgress: number) {

    // Create Subcontract
    const sub = await prisma.subcontract.create({
        data: {
            name: `Lot ${articles[0].type} - ${subcontractor.name}`,
            status: 'ACTIVE',
            projectId: projectId,
            subcontractorId: subcontractor.id,
            startDate: new Date('2024-02-01'),
            totalAmount: articles.reduce((sum, a) => sum + (a.totalAmount * 0.9), 0) // Negotiated at 90% of market
        }
    })

    // Create SubItems & Tasks
    const subItems = []
    for (const art of articles) {
        const item = await prisma.subcontractItem.create({
            data: {
                subcontractId: sub.id,
                marketArticleId: art.id,
                description: art.designation,
                unit: art.unit,
                unitPrice: art.unitPrice * 0.9, // 10% margin
                quantity: art.quantity,
                totalAmount: (art.unitPrice * 0.9) * art.quantity
            }
        })
        subItems.push(item)

        // Create Operational Task linked to this item
        await prisma.task.create({
            data: {
                title: `Exécution: ${art.designation}`,
                status: 'IN_PROGRESS', // Should logic based on targetProgress
                progress: Math.floor(targetProgress * 100),
                priority: 'HIGH',
                projectId: projectId,
                subcontractId: sub.id,
                subcontractItem: {
                    connect: { id: item.id }
                },
                startDate: new Date('2024-02-15')
            }
        })
    }

    // Create 3-4 Bills to simulate history up to targetProgress
    // We split targetProgress into 3 steps: 20%, 40%, remaining(e.g. 7%).
    const steps = [0.2, 0.3, Math.max(0, targetProgress - 0.5)] // rough split
    let currentCumulative = 0

    for (let i = 0; i < steps.length; i++) {
        const stepPct = steps[i]
        if (stepPct <= 0) continue

        const billDate = new Date('2024-03-01')
        billDate.setMonth(billDate.getMonth() + i)

        // Calculate amounts
        let billProgressAmount = 0
        const billItemsData = []

        for (const item of subItems) {
            const itemTotal = item.unitPrice * item.quantity

            const previousPct = currentCumulative * 100
            const stepPctValue = stepPct * 100
            const totalPct = (currentCumulative + stepPct) * 100

            const currentAmount = itemTotal * stepPct
            const previousAmount = itemTotal * currentCumulative
            const totalAmount = itemTotal * (currentCumulative + stepPct)

            billProgressAmount += currentAmount

            billItemsData.push({
                subcontractItemId: item.id,
                previousPercentage: previousPct,
                currentPercentage: stepPctValue,
                totalPercentage: totalPct,
                previousAmount: previousAmount,
                currentAmount: currentAmount,
                totalAmount: totalAmount
            })
        }

        const retention = billProgressAmount * 0.10 // 10% RG
        const net = billProgressAmount - retention

        await prisma.subcontractorBill.create({
            data: {
                subcontractId: sub.id,
                number: `SIT-${suffix}-${(i + 1).toString().padStart(2, '0')}`,
                date: billDate,
                status: i === steps.length - 1 ? 'SUBMITTED' : 'PAID',
                progressAmount: billProgressAmount,
                retentionAmount: retention,
                totalAmount: net,
                items: {
                    create: billItemsData
                }
            }
        })

        currentCumulative += stepPct
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
