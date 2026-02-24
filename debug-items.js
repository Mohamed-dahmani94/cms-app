
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const id = "3d05031d-93fa-4d44-abaa-0b7bc338b26c"
        const subcontract = await prisma.subcontract.findUnique({
            where: { id },
            include: {
                items: true,
                tasks: true
            }
        })
        console.log("Items count:", subcontract.items.length)
        console.log("Tasks count:", subcontract.tasks.length)
        console.log("First Item:", subcontract.items[0])
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}
main()
