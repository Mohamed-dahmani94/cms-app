const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const projectCount = await prisma.project.count()
        console.log(`Projects: ${projectCount}`)
        const userCount = await prisma.user.count()
        console.log(`Users: ${userCount}`)
        if (projectCount > 0) {
            const projects = await prisma.project.findMany()
            console.log("Projects found:", JSON.stringify(projects, null, 2))
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
