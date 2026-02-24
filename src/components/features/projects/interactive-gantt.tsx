"use client"

import { useEffect, useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight, Edit2, Save, X } from "lucide-react"

interface ArticleData {
    id: string
    code: string
    designation: string
    startDate: Date | null      // Theoretical (planned)
    endDate: Date | null        // Theoretical (planned)
    realStartDate: Date | null  // Real (from tasks)
    realEndDate: Date | null    // Real (from tasks)
    minDuration: number
    tasks: TaskData[]
}

interface TaskData {
    id: string
    code: string
    designation: string
    duration: number
}

interface LotData {
    id: string
    code: string
    name: string
    articles: ArticleData[]
}

interface InteractiveGanttProps {
    projectId: string
    readOnly?: boolean
    printViewMode?: 'global' | 'detailed'
    printDateMode?: 'theoretical' | 'real' | 'both'
}

export function InteractiveGantt({ projectId, readOnly = false, printViewMode, printDateMode }: InteractiveGanttProps) {
    const [lots, setLots] = useState<LotData[]>([])
    const [loading, setLoading] = useState(true)
    // Initialize expanded states based on printViewMode if provided
    const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set())
    const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())

    // UI Logic for edit mode
    const [editingArticle, setEditingArticle] = useState<string | null>(null)
    const [editStartDate, setEditStartDate] = useState("")
    const [editEndDate, setEditEndDate] = useState("")

    // Data & Options
    const [odsDate, setOdsDate] = useState<Date | null>(null)
    const [showTheoretical, setShowTheoretical] = useState(true)
    const [showReal, setShowReal] = useState(true)

    // Handle Print Modes
    useEffect(() => {
        if (printDateMode) {
            setShowTheoretical(printDateMode === 'theoretical' || printDateMode === 'both')
            setShowReal(printDateMode === 'real' || printDateMode === 'both')
        }
    }, [printDateMode])

    // Fetch data and setup expansion for Print
    useEffect(() => {
        fetchData()
    }, [projectId])

    // Effect to handle "Expand All" for print view AFTER data is loaded
    useEffect(() => {
        if (!loading && lots.length > 0 && printViewMode) {
            if (printViewMode === 'global') {
                // Collapse all: Start with empty set
                setExpandedLots(new Set())
            } else if (printViewMode === 'detailed') {
                // Expand all lots AND articles
                setExpandedLots(new Set(lots.map(l => l.id)))
                const allArticleIds = lots.flatMap(l => l.articles.map(a => a.id))
                setExpandedArticles(new Set(allArticleIds))
            }
        }
    }, [loading, lots, printViewMode])


    const fetchData = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/market`)
            if (res.ok) {
                const data = await res.json()
                const market = data.market

                let baseDate = new Date()
                if (market?.odsDate) {
                    baseDate = new Date(market.odsDate)
                    setOdsDate(baseDate)
                }

                let currentDate = new Date(baseDate)

                const lotsData: LotData[] = market?.lots?.map((lot: any) => ({
                    id: lot.id,
                    code: lot.code,
                    name: lot.name,
                    articles: lot.articles?.map((article: any) => {
                        const totalTaskDuration = article.tasks?.reduce((sum: number, t: any) => sum + (t.duration || 0), 0) || 7

                        let startDate = article.startDate ? new Date(article.startDate) : new Date(currentDate)
                        let endDate = article.endDate ? new Date(article.endDate) : null

                        if (!endDate) {
                            endDate = new Date(startDate)
                            endDate.setDate(endDate.getDate() + totalTaskDuration)
                        }

                        currentDate = new Date(endDate)

                        return {
                            id: article.id,
                            code: article.code,
                            designation: article.designation,
                            startDate,
                            endDate,
                            realStartDate: article.realStartDate ? new Date(article.realStartDate) : null,
                            realEndDate: article.realEndDate ? new Date(article.realEndDate) : null,
                            minDuration: totalTaskDuration,
                            tasks: article.tasks?.map((task: any) => ({
                                id: task.id,
                                code: task.code,
                                designation: task.designation,
                                duration: task.duration || 0
                            })) || []
                        }
                    }) || []
                })) || []

                setLots(lotsData)
            }
        } catch (error) {
            console.error("Failed to fetch market data:", error)
        } finally {
            setLoading(false)
        }
    }

    const { timelineStart, timelineEnd, months, years } = useMemo(() => {
        const allDates: Date[] = []

        if (odsDate) allDates.push(new Date(odsDate))

        lots.forEach(lot => {
            lot.articles.forEach(article => {
                if (article.startDate) allDates.push(new Date(article.startDate))
                if (article.endDate) allDates.push(new Date(article.endDate))
                if (article.realStartDate) allDates.push(new Date(article.realStartDate))
                if (article.realEndDate) allDates.push(new Date(article.realEndDate))
            })
        })

        if (allDates.length === 0) {
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            const end = new Date(now.getFullYear(), now.getMonth() + 6, 0)
            return { timelineStart: start, timelineEnd: end, months: generateMonths(start, end), years: generateYears(start, end) }
        }

        let minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
        let maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

        minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
        maxDate.setMonth(maxDate.getMonth() + 1)
        maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)

        return { timelineStart: minDate, timelineEnd: maxDate, months: generateMonths(minDate, maxDate), years: generateYears(minDate, maxDate) }
    }, [lots, odsDate])

    function generateYears(start: Date, end: Date) {
        const years: { year: number; months: { month: number; label: string; width: number }[] }[] = []
        const startYear = start.getFullYear()
        const endYear = end.getFullYear()
        const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

        for (let y = startYear; y <= endYear; y++) {
            const yearMonths: { month: number; label: string; width: number }[] = []
            const startMonth = (y === startYear) ? start.getMonth() : 0
            const endMonth = (y === endYear) ? end.getMonth() : 11

            for (let m = startMonth; m <= endMonth; m++) {
                const monthStart = new Date(y, m, 1)
                const monthEnd = new Date(y, m + 1, 0)
                const daysInMonth = monthEnd.getDate()
                const width = (daysInMonth / totalDays) * 100

                yearMonths.push({
                    month: m,
                    label: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
                    width
                })
            }

            years.push({ year: y, months: yearMonths })
        }

        return years
    }

    function generateMonths(start: Date, end: Date) {
        const months: { date: Date; label: string; width: number }[] = []
        const current = new Date(start.getFullYear(), start.getMonth(), 1)
        const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

        while (current <= end) {
            const monthStart = new Date(current)
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
            const daysInMonth = monthEnd.getDate()
            const width = Math.max(2, (daysInMonth / totalDays) * 100)

            months.push({
                date: monthStart,
                label: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
                width
            })

            current.setMonth(current.getMonth() + 1)
        }

        return months
    }

    const getPositionPercent = (date: Date | null) => {
        if (!date || !timelineStart || !timelineEnd) return 0
        const total = timelineEnd.getTime() - timelineStart.getTime()
        if (total <= 0) return 0
        const current = date.getTime() - timelineStart.getTime()
        return Math.max(0, Math.min(100, (current / total) * 100))
    }

    const toggleLot = (id: string) => {
        setExpandedLots(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleArticle = (id: string) => {
        setExpandedArticles(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const startEditing = (article: ArticleData) => {
        setEditingArticle(article.id)
        setEditStartDate(article.startDate ? article.startDate.toISOString().split('T')[0] : '')
        setEditEndDate(article.endDate ? article.endDate.toISOString().split('T')[0] : '')
    }

    const cancelEditing = () => {
        setEditingArticle(null)
        setEditStartDate("")
        setEditEndDate("")
    }

    // Only save theoretical dates - real dates come from tasks
    const saveArticleDates = async (articleId: string) => {
        try {
            const res = await fetch(`/api/articles/${articleId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    startDate: editStartDate || null,
                    endDate: editEndDate || null
                })
            })

            if (res.ok) {
                fetchData()
                cancelEditing()
            }
        } catch (error) {
            console.error("Failed to update article:", error)
        }
    }

    const formatDate = (date: Date | null) => {
        if (!date) return "—"
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    }

    // Helper component for Timeline Header to allow reuse
    const TimelineHeader = () => (
        <>
            {/* Timeline Header - Years Row */}
            <div className="flex border-t border-x rounded-t overflow-hidden text-xs">
                <div className="w-72 flex-shrink-0 bg-gray-200 dark:bg-gray-700 p-1 font-bold border-r text-center">
                    Année
                </div>
                <div className="flex-1 flex bg-gray-100 dark:bg-gray-800">
                    {years.map((yearData, idx) => {
                        const yearWidth = yearData.months.reduce((sum, m) => sum + m.width, 0)
                        return (
                            <div
                                key={idx}
                                className="text-center py-1 border-r last:border-r-0 border-gray-300 dark:border-gray-600 font-bold"
                                style={{ width: `${yearWidth}%` }}
                            >
                                {yearData.year}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Timeline Header - Months Row */}
            <div className="flex border-x border-b rounded-b overflow-hidden text-xs mb-1">
                <div className="w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800 p-1 font-semibold border-r text-center">
                    Élément
                </div>
                <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
                    {months.map((month, idx) => (
                        <div
                            key={idx}
                            className="text-center py-1 border-r last:border-r-0 border-gray-200 dark:border-gray-700 text-[10px]"
                            style={{ width: `${month.width}%`, minWidth: '25px' }}
                        >
                            {month.label}
                        </div>
                    ))}
                </div>
            </div>
        </>
    )

    if (loading) return <p className="text-center py-8">Chargement...</p>
    if (lots.length === 0) return <p className="text-center py-8 text-gray-500">Aucune donnée disponible.</p>

    return (
        <div className="space-y-2">
            {/* ODS Header */}
            {odsDate && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 text-sm">
                    <Badge className="bg-blue-600">ODS</Badge>
                    <span>Démarrage: <strong>{formatDate(odsDate)}</strong></span>
                </div>
            )}

            {/* Display Toggles - Hide in readOnly mode */}
            {!readOnly && (
                <div className="flex items-center gap-4 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                    <span className="text-gray-500">Afficher:</span>
                    <button
                        onClick={() => setShowTheoretical(!showTheoretical)}
                        className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${showTheoretical ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-400'}`}
                    >
                        <div className={`w-3 h-2 rounded ${showTheoretical ? 'bg-green-500' : 'bg-gray-300'}`} />
                        Théorique
                    </button>
                    <button
                        onClick={() => setShowReal(!showReal)}
                        className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${showReal ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-gray-100 border-gray-300 text-gray-400'}`}
                    >
                        <div className={`w-3 h-2 rounded ${showReal ? 'bg-orange-500' : 'bg-gray-300'}`} />
                        Réel
                    </button>
                </div>
            )}

            {/* Only show MAIN header if NOT in detailed print mode (where headers are repeated) */}
            {printViewMode !== 'detailed' && <TimelineHeader />}

            {/* Gantt Rows */}
            {lots.map((lot, lotIndex) => {
                const isLotExpanded = expandedLots.has(lot.id)

                // Theoretical dates (from articles' startDate/endDate)
                const articlesWithTheoDates = lot.articles.filter(a => a.startDate && a.endDate)
                const lotTheoStart = articlesWithTheoDates.length > 0
                    ? new Date(Math.min(...articlesWithTheoDates.map(a => a.startDate!.getTime())))
                    : null
                const lotTheoEnd = articlesWithTheoDates.length > 0
                    ? new Date(Math.max(...articlesWithTheoDates.map(a => a.endDate!.getTime())))
                    : null
                const lotTheoLeft = getPositionPercent(lotTheoStart)
                const lotTheoWidth = lotTheoEnd && lotTheoStart ? getPositionPercent(lotTheoEnd) - lotTheoLeft : 0

                // Real dates (from articles' realStartDate/realEndDate)
                const articlesWithRealDates = lot.articles.filter(a => a.realStartDate && a.realEndDate)
                const lotRealStart = articlesWithRealDates.length > 0
                    ? new Date(Math.min(...articlesWithRealDates.map(a => a.realStartDate!.getTime())))
                    : null
                const lotRealEnd = articlesWithRealDates.length > 0
                    ? new Date(Math.max(...articlesWithRealDates.map(a => a.realEndDate!.getTime())))
                    : null
                const lotRealLeft = getPositionPercent(lotRealStart)
                const lotRealWidth = lotRealEnd && lotRealStart ? getPositionPercent(lotRealEnd) - lotRealLeft : 0

                return (
                    <div
                        key={lot.id}
                        className={`border rounded overflow-hidden ${printViewMode === 'detailed' && lotIndex > 0 ? 'break-before-page mt-8' : ''}`}
                    >
                        {/* Repeat Header for Detailed Print Mode (except maybe first one if main header is kept, but logic above hides main header in detailed mode) */}
                        {printViewMode === 'detailed' && (
                            <div className="mb-2">
                                <TimelineHeader />
                            </div>
                        )}

                        {/* Lot Row */}
                        <div
                            className="flex cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => toggleLot(lot.id)}
                        >
                            <div className="w-72 flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-800 border-r flex items-center gap-2">
                                {isLotExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Badge className="bg-indigo-600 text-xs">{lot.code}</Badge>
                                <span className="text-sm font-semibold truncate">{lot.name}</span>
                            </div>
                            <div className="flex-1 relative h-12 bg-white dark:bg-gray-950">
                                <div className="absolute inset-0 flex">
                                    {months.map((m, i) => (
                                        <div key={i} className="border-r border-gray-100 dark:border-gray-800 h-full" style={{ width: `${m.width}%` }} />
                                    ))}
                                </div>
                                {/* Theoretical Lot Bar (top) */}
                                {showTheoretical && lotTheoWidth > 0 && (
                                    <div
                                        className="absolute top-1 h-4 bg-indigo-500 rounded flex items-center justify-between px-1 opacity-50"
                                        style={{ left: `${lotTheoLeft}%`, width: `${Math.max(lotTheoWidth, 5)}%` }}
                                        title={`Théorique: ${formatDate(lotTheoStart)} - ${formatDate(lotTheoEnd)}`}
                                    >
                                        <span className="text-[7px] text-white">{formatDate(lotTheoStart)}</span>
                                        <span className="text-[7px] text-white">{formatDate(lotTheoEnd)}</span>
                                    </div>
                                )}
                                {/* Real Lot Bar (bottom) */}
                                {showReal && lotRealWidth > 0 && (
                                    <div
                                        className="absolute bottom-1 h-4 bg-orange-500 rounded flex items-center justify-between px-1"
                                        style={{ left: `${lotRealLeft}%`, width: `${Math.max(lotRealWidth, 5)}%` }}
                                        title={`Réel: ${formatDate(lotRealStart)} - ${formatDate(lotRealEnd)}`}
                                    >
                                        <span className="text-[7px] text-white">{formatDate(lotRealStart)}</span>
                                        <span className="text-[7px] text-white">{formatDate(lotRealEnd)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Articles */}
                        {isLotExpanded && lot.articles.map(article => {
                            const isArticleExpanded = expandedArticles.has(article.id)
                            const isEditing = editingArticle === article.id

                            // Theoretical bar
                            const theoLeft = getPositionPercent(article.startDate)
                            const theoWidth = article.endDate ? getPositionPercent(article.endDate) - theoLeft : 0

                            // Real bar (read-only, from tasks)
                            // If only realStartDate exists, show bar from start to today (in-progress)
                            const realLeft = getPositionPercent(article.realStartDate)
                            const realEndOrToday = article.realEndDate ? article.realEndDate : (article.realStartDate ? new Date() : null)
                            const realWidth = realEndOrToday ? getPositionPercent(realEndOrToday) - realLeft : 0
                            const isRealInProgress = article.realStartDate && !article.realEndDate

                            return (
                                <div key={article.id} className="border-t">
                                    {/* Article Row */}
                                    <div className="flex">
                                        <div className="w-72 flex-shrink-0 p-1.5 pl-8 border-r bg-white dark:bg-gray-950">
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm" className="p-0 h-5 w-5" onClick={() => toggleArticle(article.id)}>
                                                    {isArticleExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                </Button>
                                                <Badge variant="outline" className="text-[10px]">{article.code}</Badge>
                                                <span className="text-xs truncate flex-1">{article.designation}</span>
                                                {!readOnly && (
                                                    <Button variant="ghost" size="sm" className="p-0 h-5 w-5" onClick={() => startEditing(article)} title="Modifier dates théoriques">
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            {isEditing && (
                                                <div className="mt-1 ml-6 space-y-1">
                                                    <div className="flex items-center gap-1 text-[10px]">
                                                        <span className="w-16 text-green-600">Théorique:</span>
                                                        <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="h-5 text-[10px] w-24 px-1" />
                                                        <span>→</span>
                                                        <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className="h-5 text-[10px] w-24 px-1" />
                                                    </div>
                                                    {/* Real dates shown as read-only info */}
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                        <span className="w-16 text-orange-500">Réel:</span>
                                                        <span>{formatDate(article.realStartDate)} → {formatDate(article.realEndDate)}</span>
                                                        <span className="italic text-[9px]">(modifiable via tâches)</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button size="sm" className="h-5 px-2 text-[10px]" onClick={() => saveArticleDates(article.id)}>Enregistrer</Button>
                                                        <Button size="sm" variant="ghost" className="h-5 px-2 text-[10px]" onClick={cancelEditing}>Annuler</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 relative h-12 bg-white dark:bg-gray-950">
                                            <div className="absolute inset-0 flex">
                                                {months.map((m, i) => (
                                                    <div key={i} className="border-r border-gray-50 dark:border-gray-900 h-full" style={{ width: `${m.width}%` }} />
                                                ))}
                                            </div>
                                            {/* Theoretical bar (top, semi-transparent green) */}
                                            {showTheoretical && theoWidth > 0 && (
                                                <div
                                                    className="absolute top-1 h-4 bg-green-500 rounded opacity-50 flex items-center justify-between px-1 cursor-pointer"
                                                    style={{ left: `${theoLeft}%`, width: `${Math.max(theoWidth, 5)}%` }}
                                                    onClick={() => !readOnly && startEditing(article)}
                                                    title={`Théorique: ${formatDate(article.startDate)} - ${formatDate(article.endDate)}`}
                                                >
                                                    <span className="text-[7px] text-white">{formatDate(article.startDate)}</span>
                                                    <span className="text-[7px] text-white">{formatDate(article.endDate)}</span>
                                                </div>
                                            )}
                                            {/* Real bar (bottom, solid orange - read only) */}
                                            {showReal && realWidth > 0 && (
                                                <div
                                                    className={`absolute bottom-1 h-4 rounded flex items-center justify-between px-1 ${isRealInProgress ? '' : 'bg-orange-500'}`}
                                                    style={{
                                                        left: `${realLeft}%`,
                                                        width: `${Math.max(realWidth, 5)}%`,
                                                        ...(isRealInProgress ? {
                                                            background: 'repeating-linear-gradient(45deg, #f97316, #f97316 4px, #fb923c 4px, #fb923c 8px)'
                                                        } : {})
                                                    }}
                                                    title={`Réel: ${formatDate(article.realStartDate)}${article.realEndDate ? ' - ' + formatDate(article.realEndDate) : ' (en cours...)'}`}
                                                >
                                                    <span className="text-[7px] text-white font-bold drop-shadow">{formatDate(article.realStartDate)}</span>
                                                    <span className="text-[7px] text-white font-bold drop-shadow">{isRealInProgress ? '→ En cours' : formatDate(article.realEndDate)}</span>
                                                </div>
                                            )}
                                            {/* No real dates yet - only show if showReal is on */}
                                            {showReal && showTheoretical && theoWidth > 0 && !article.realStartDate && (
                                                <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center">
                                                    <span className="text-[8px] text-gray-400 italic">Réel: défini via Gestion des Tâches</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tasks */}
                                    {isArticleExpanded && article.tasks.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-gray-900 border-t">
                                            {article.tasks.map(task => (
                                                <div key={task.id} className="flex border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                                                    <div className="w-72 flex-shrink-0 p-1 pl-14 border-r flex items-center gap-1">
                                                        <Badge variant="secondary" className="text-[10px]">{task.code}</Badge>
                                                        <span className="text-[11px] truncate">{task.designation}</span>
                                                        <span className="text-[10px] text-orange-500 ml-auto">{task.duration}j</span>
                                                    </div>
                                                    <div className="flex-1 h-5 bg-gray-50 dark:bg-gray-900 relative">
                                                        <div className="absolute inset-0 flex opacity-30">
                                                            {months.map((m, i) => (
                                                                <div key={i} className="border-r border-gray-200 dark:border-gray-700 h-full" style={{ width: `${m.width}%` }} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )
            })}

        </div>
    )
}
