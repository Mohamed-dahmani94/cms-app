const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Helpers
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)]
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))

const LOTS = [
    "Installation de Chantier", "Terrassement", "Infrastructure", "Superstructure Bloc A", "Superstructure Bloc B",
    "Superstructure Bloc C", "Maçonnerie", "Enduits", "Electricité", "Plomberie", "Chauffage / HVAC",
    "Peinture", "Menuiserie Aluminium", "Menuiserie Bois", "Aménagement Extérieur"
]

async function main() {
    console.log("🌱 Starting seeding...")

    // 1. Clean Database (Optional - be careful in prod, but safe for localhost dev)
    // await prisma.transaction.deleteMany() - simpler to just ensure unique emails

    const password = await bcrypt.hash('admin123', 10)

    // 2. Create Users
    console.log("Creating Users...")

    // Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@demo.com' },
        create: { email: 'admin@demo.com', name: 'Admin Principal', password, role: 'ADMIN' },
        update: { password }
    })

    // Engineers (15)
    const engineers = []
    for (let i = 1; i <= 15; i++) {
        const eng = await prisma.user.upsert({
            where: { email: `ingenieur${i}@demo.com` },
            create: {
                email: `ingenieur${i}@demo.com`,
                name: `Ingénieur ${i}`,
                password,
                role: 'ENGINEER',
                specialty: i <= 5 ? 'Génie Civil' : i <= 10 ? 'CES' : 'Architecture'
            },
            update: { password }
        })
        engineers.push(eng)
    }

    // Subcontractors (5)
    const subcontractors = []
    const subSpecialties = ['Electricité', 'Plomberie', 'Peinture', 'Menuiserie', 'Etanchéité']
    for (let i = 1; i <= 5; i++) {
        const sub = await prisma.user.upsert({
            where: { email: `sous.traitant${i}@demo.com` },
            create: {
                email: `sous.traitant${i}@demo.com`,
                name: `Entreprise ${subSpecialties[i - 1]} SARL`,
                password,
                role: 'SUBCONTRACTOR',
                specialty: subSpecialties[i - 1]
            },
            update: { password }
        })
        subcontractors.push(sub)
    }

    // Workers (10)
    for (let i = 1; i <= 10; i++) {
        await prisma.user.upsert({
            where: { email: `ouvrier${i}@demo.com` },
            create: { email: `ouvrier${i}@demo.com`, name: `Ouvrier ${i}`, password, role: 'DAILY_WORKER' },
            update: { password }
        })
    }

    // 3. Create Project
    console.log("Creating Project...")
    const project = await prisma.project.create({
        data: {
            name: 'Résidence Les Jardins de la Paix',
            description: 'Projet de 150 logements haut standing avec commerces et parking sous-terrain.',
            location: 'Oran, Algérie',
            status: 'ACTIVE',
            client: 'Direction du Logement',
            estimatedCost: 450000000,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2026-06-30')
        }
    })

    // 4. Create Market Structure
    console.log("Creating Market Structure...")
    const market = await prisma.market.create({
        data: {
            marketNumber: '2024/DL/ORAN/052',
            marketDate: new Date('2023-12-15'),
            estimatedCost: 450000000,
            projectId: project.id
        }
    })

    // 5. Create Lots, Articles and Tasks
    let allTasks = []
    let allArticles = []

    for (let i = 0; i < LOTS.length; i++) {
        const lot = await prisma.marketLot.create({
            data: {
                marketId: market.id,
                code: `LOT-${(i + 1).toString().padStart(2, '0')}`,
                name: LOTS[i],
                order: i
            }
        })

        // Create 3-6 Articles per Lot
        const numArticles = getRandomInt(3, 6)
        for (let j = 1; j <= numArticles; j++) {
            const quantity = getRandomInt(100, 1000)
            const unitPrice = getRandomInt(1000, 5000)

            const article = await prisma.marketArticle.create({
                data: {
                    lotId: lot.id,
                    code: `${lot.code}.${j}`,
                    designation: `${lot.name} - Article ${j}`,
                    unit: getRandomElement(['m²', 'm³', 'ml', 'U', 'Ens']),
                    unitPrice: unitPrice,
                    quantity: quantity,
                    totalAmount: unitPrice * quantity,
                    startDate: new Date('2024-02-01'),
                    endDate: new Date('2024-05-30'),
                    realStartDate: Math.random() > 0.3 ? new Date('2024-02-05') : null
                }
            })
            allArticles.push(article)

            // Create Tasks for this Article
            const numTasks = getRandomInt(2, 4)
            for (let k = 1; k <= numTasks; k++) {
                // Ensure ArticleTask exists
                const taskRef = await prisma.articleTask.create({
                    data: {
                        articleId: article.id,
                        code: `T-${j}-${k}`,
                        designation: `Tâche ${k} pour ${article.designation}`,
                        duration: getRandomInt(2, 10),
                    }
                })

                // Create Actual Task
                const isStarted = Math.random() > 0.4
                const progress = isStarted ? getRandomInt(10, 100) : 0
                const status = progress === 100 ? 'FINAL_DONE' : (isStarted ? 'IN_PROGRESS' : 'PENDING')

                const task = await prisma.task.create({
                    data: {
                        title: taskRef.designation,
                        description: `Execution details for ${taskRef.designation}`,
                        status: status,
                        priority: getRandomElement(['LOW', 'MEDIUM', 'HIGH']),
                        progress: progress,
                        projectId: project.id,
                        assignedToId: getRandomElement(engineers).id, // Assign to random engineer
                        startDate: isStarted ? new Date('2024-02-10') : null,
                        ArticleTask: {
                            connect: { id: taskRef.id }
                        }
                    }
                })

                allTasks.push(task)
            }
        }
    }

    // 6. Subcontracts and Assignments
    console.log("Creating Subcontracts and Assigning Tasks...")

    // Assign specific Lots to Subcontractors
    // We'll pick 5 random lots to assign fully to the 5 subcontractors
    const shuffledLots = [...LOTS].sort(() => 0.5 - Math.random()) // simple shuffle

    for (let i = 0; i < 5; i++) {
        const subUser = subcontractors[i]
        const lotName = shuffledLots[i] // e.g., "Electricité" matched with "Entreprise Electricité" ideally, but random is okay for demo

        // Find the lot ID from DB (inefficient query but fine for seed)
        const marketLotItems = await prisma.marketLot.findMany({
            where: { marketId: market.id },
            include: { articles: { include: { tasks: { include: { task: true } } } } }
        })
        const targetLot = marketLotItems.find(l => l.name === lotName) || marketLotItems[i]

        if (!targetLot) continue

        // Calculate Lot Amount
        const lotAmount = targetLot.articles.reduce((sum, art) => sum + art.totalAmount, 0)

        // Create Subcontract
        const subcontract = await prisma.subcontract.create({
            data: {
                name: `Marché de Sous-traitance - ${targetLot.name}`,
                status: 'ACTIVE',
                totalAmount: lotAmount * 0.8, // Subcontractor gets 80% of market price
                subcontractorId: subUser.id,
                projectId: project.id,
                startDate: new Date('2024-03-01'),
                endDate: new Date('2024-12-31')
            }
        })

        // Assign all tasks in this lot to this subcontract
        for (const art of targetLot.articles) {
            for (const artTask of art.tasks) {
                if (artTask.task) {
                    await prisma.task.update({
                        where: { id: artTask.task.id },
                        data: {
                            subcontractId: subcontract.id,
                            subcontractorPrice: (art.unitPrice * (art.quantity / art.tasks.length)) * 0.8, // Rough split
                            progress: getRandomInt(20, 90) // Subcontractors are working!
                        }
                    })
                }
            }
        }

        // Generate Subcontractor Bills (Situations)
        // Create 2 situations
        for (let sit = 1; sit <= 2; sit++) {
            await prisma.subcontractorBill.create({
                data: {
                    number: `SIT-${subcontract.id.substring(0, 4)}-0${sit}`,
                    status: sit === 1 ? 'PAID' : 'VALIDATED', // First paid, second validated
                    date: sit === 1 ? new Date('2024-04-01') : new Date('2024-05-01'),
                    progressAmount: (lotAmount * 0.8) * 0.2, // 20% each
                    totalAmount: (lotAmount * 0.8) * 0.2,
                    subcontractId: subcontract.id
                }
            })
        }
    }

    // 7. General Company Invoices (Factures Entreprise)
    console.log("Generating Company Invoices...")
    for (let i = 1; i <= 6; i++) {
        const invoice = await prisma.invoice.create({
            data: {
                number: `FACT-2024-${i.toString().padStart(3, '0')}`,
                status: i <= 4 ? 'VALIDATED' : 'DRAFT',
                projectId: project.id,
                totalAmount: getRandomInt(5000000, 20000000),
                date: new Date(2024, i, 15)
            }
        })

        // Add some items to invoice
        // Pick random articles
        for (let j = 0; j < 5; j++) {
            const art = getRandomElement(allArticles)
            await prisma.invoiceItem.create({
                data: {
                    invoiceId: invoice.id,
                    articleId: art.id,
                    designation: art.designation,
                    unit: art.unit,
                    unitPrice: art.unitPrice,
                    marketQuantity: art.quantity,
                    currentQuantity: 10,
                    currentPercentage: 10,
                    totalPercentage: (i * 10), // increasing percentage
                    currentAmount: 10 * art.unitPrice,
                    totalAmount: (i * 10) * (art.quantity * art.unitPrice / 100)
                }
            })
        }
    }

    console.log("✅ Seeding completed successfully!")
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
