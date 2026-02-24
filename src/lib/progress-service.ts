
import { prisma } from "@/lib/prisma"

export async function recalculateProgress(taskId: string, newProgress: number) {
    try {
        console.log(`[PROGRESS] Recalculating for task ${taskId} with progress ${newProgress}%`)

        // 1. Sync ArticleTask: ArticleTask doesn't store percentage directly in the model as per schema check.
        // It relies on the linked Task or Subtasks.
        // We just verify link exists.
        const articleTask = await prisma.articleTask.findUnique({
            where: { taskId },
            include: { article: true }
        })

        if (!articleTask) {
            console.log(`[PROGRESS] No linked ArticleTask for task ${taskId}`)
            return
        }

        const articleId = articleTask.articleId

        // 2. Recalculate MarketArticle Progress
        // Get all tasks for this article, including their linked operational Task
        const allArticleTasks = await prisma.articleTask.findMany({
            where: { articleId },
            include: {
                subTasks: true,
                task: true // Include the operational task to get its progress
            }
        })

        let totalWeightedProgress = 0
        let totalWeight = 0

        for (const at of allArticleTasks) {
            // Determine progress for this ArticleTask
            let currentProgress = 0

            if (at.task) {
                // If linked to an operational task, use its progress
                currentProgress = at.task.progress
            } else if (at.subTasks.length > 0) {
                // Fallback to subtasks if no operational task linked (legacy mode)
                // Using simple average of subtask completion
                const sum = at.subTasks.reduce((acc, st) => acc + st.completionPercentage, 0)
                currentProgress = sum / at.subTasks.length
            }

            // Weighting: Use duration as weight
            const weight = at.duration || 1
            totalWeightedProgress += (currentProgress * weight)
            totalWeight += weight
        }

        const articleProgress = totalWeight > 0 ? totalWeightedProgress / totalWeight : 0
        console.log(`[PROGRESS] Article ${articleId} progress: ${articleProgress}%`)

        // Update BlockArticleProgress entries associated with this article
        const blockProgresses = await prisma.blockArticleProgress.findMany({
            where: { articleId },
            include: { article: true } // REQUIRED to access article.totalAmount
        })

        for (const bp of blockProgresses) {
            // Update completion

            const newCompletedAmount = (articleProgress / 100) * bp.article.totalAmount

            await prisma.blockArticleProgress.update({
                where: { id: bp.id },
                data: {
                    completionPercentage: articleProgress,
                    completedAmount: newCompletedAmount
                }
            })
        }

    } catch (error) {
        console.error("[PROGRESS] Error recalculating progress:", error)
    }
}
