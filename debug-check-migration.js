
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const id = "3d05031d-93fa-4d44-abaa-0b7bc338b26c"
        const subcontract = await prisma.subcontract.findUnique({
            where: { id },
            include: {
                items: true
            }
        })
        console.log("Items verification count:", subcontract.items.length)
        if (subcontract.items.length > 0) {
            console.log("First item:", subcontract.items[0])
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}
main()
