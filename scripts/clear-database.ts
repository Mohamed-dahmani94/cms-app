import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearDatabase() {
    try {
        console.log('🗑️  Clearing database...')

        // Delete in order to respect foreign key constraints
        await prisma.task.deleteMany({})
        console.log('✅ Deleted all tasks')

        await prisma.projectPhase.deleteMany({})
        console.log('✅ Deleted all project phases')

        await prisma.document.deleteMany({})
        console.log('✅ Deleted all documents')

        await prisma.transaction.deleteMany({})
        console.log('✅ Deleted all transactions')

        await prisma.costCenter.deleteMany({})
        console.log('✅ Deleted all cost centers')

        await prisma.project.deleteMany({})
        console.log('✅ Deleted all projects')

        console.log('✨ Database cleared successfully!')
    } catch (error) {
        console.error('❌ Error clearing database:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

clearDatabase()
