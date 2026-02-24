import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const project = await prisma.project.findUnique({
            where: { id: params.id },
            include: {
                phases: {
                    include: {
                        tasks: true
                    }
                },
                tasks: {
                    include: {
                        assignedTo: {
                            select: { name: true }
                        }
                    }
                },
                costCenter: {
                    include: {
                        transactions: true
                    }
                }
            }
        })

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Calculate statistics
        const totalTasks = project.tasks.length
        const completedTasks = project.tasks.filter(t => t.status === "FINAL_DONE").length
        const inProgressTasks = project.tasks.filter(t => t.status === "IN_PROGRESS" || t.status === "PRELIMINARY_DONE").length
        const pendingTasks = project.tasks.filter(t => t.status === "PENDING").length

        const totalPhases = project.phases.length
        const completedPhases = project.phases.filter(p => p.status === "COMPLETED").length
        const inProgressPhases = project.phases.filter(p => p.status === "IN_PROGRESS").length

        // Budget tracking
        const totalExpenses = project.costCenter?.totalExpenses || 0
        const totalIncome = project.costCenter?.totalIncome || 0
        const estimatedCost = project.estimatedCost || 0
        const budgetVariance = estimatedCost - totalExpenses

        // Recent activities
        const recentTasks = project.tasks
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5)

        const report = {
            project: {
                id: project.id,
                name: project.name,
                status: project.status,
                startDate: project.startDate,
                endDate: project.endDate,
                client: project.client,
                location: project.location
            },
            summary: {
                tasks: {
                    total: totalTasks,
                    completed: completedTasks,
                    inProgress: inProgressTasks,
                    pending: pendingTasks,
                    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                },
                phases: {
                    total: totalPhases,
                    completed: completedPhases,
                    inProgress: inProgressPhases,
                    completionRate: totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0
                },
                budget: {
                    estimated: estimatedCost,
                    spent: totalExpenses,
                    income: totalIncome,
                    variance: budgetVariance,
                    percentageSpent: estimatedCost > 0 ? Math.round((totalExpenses / estimatedCost) * 100) : 0
                }
            },
            recentActivities: recentTasks.map(t => ({
                id: t.id,
                title: t.title,
                status: t.status,
                assignedTo: t.assignedTo?.name,
                updatedAt: t.updatedAt
            })),
            generatedAt: new Date().toISOString()
        }

        return NextResponse.json(report)
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 })
    }
}
