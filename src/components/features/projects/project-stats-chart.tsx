"use client"

import { useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency } from "@/lib/currency"

interface ProjectStatsChartProps {
    stats: any
}

export function ProjectStatsChart({ stats }: ProjectStatsChartProps) {
    const data = useMemo(() => {
        if (!stats) return []

        const billingHistory = stats.billingHistory || []
        const plannedTrend = stats.plannedTrend || []

        // Collect all dates
        const allDates = new Set<string>()
        billingHistory.forEach((i: any) => allDates.add(i.date))
        plannedTrend.forEach((i: any) => allDates.add(i.date))

        // Sort dates
        const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        // Calculate planned total for interpolation
        const startPlanned = plannedTrend[0]
        const endPlanned = plannedTrend[plannedTrend.length - 1]

        const getPlannedValue = (dateStr: string) => {
            if (!startPlanned || !endPlanned) return 0
            const d = new Date(dateStr).getTime()
            const start = new Date(startPlanned.date).getTime()
            const end = new Date(endPlanned.date).getTime()
            const total = endPlanned.amount

            if (d < start) return 0
            if (d > end) return total
            if (end === start) return total

            return ((d - start) / (end - start)) * total
        }

        // Build chart data
        let lastBilling = 0

        return sortedDates.map(date => {
            // Find specific billing event on this date
            const billingEvent = billingHistory.find((i: any) => i.date === date)
            if (billingEvent) lastBilling = billingEvent.amount

            // For billing, if no event, we hold the last value (Step logic). 
            // However, with sorted dates, we just take the current known accumulated value.
            // But wait, if we have gaps between invoice dates, we might want to show the step.
            // If we just map the union of dates, Recharts will interpolate linearly between points unless we use type="stepAfter".
            // type="stepAfter" is good for billing.

            return {
                date,
                facture: lastBilling,
                prevu: getPlannedValue(date)
            }
        })
    }, [stats])

    // If no stats, return null
    if (!stats) return null

    const totalMarket = stats.totalMarketAmount || 0
    const production = stats.productionCost || 0

    // If no data (no history, no planning), create a fallback to allow rendering ReferenceLines
    // We use Today as the date point
    const chartData = data.length > 0 ? data : [
        { date: new Date().toISOString().split('T')[0], facture: 0, prevu: 0 }
    ]

    return (
        <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 10,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        tick={{ fontSize: 10 }}
                        minTickGap={30}
                    />
                    <YAxis
                        tickFormatter={(val) => {
                            if (val >= 1000000) {
                                return (val / 1000000).toFixed(1) + " M"
                            }
                            return formatCurrency(val, "DZD")
                        }}
                        tick={{ fontSize: 10 }}
                        width={45}
                        domain={[0, totalMarket > 0 ? totalMarket : 'auto']}
                    />
                    <Tooltip
                        formatter={(value: any) => formatCurrency(value, "DZD")}
                        labelFormatter={(label) => new Date(label as string).toLocaleDateString('fr-FR')}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />

                    <ReferenceLine
                        y={totalMarket}
                        label={{ value: "Marché Total", position: 'insideTopRight', fill: '#64748b', fontSize: 10 }}
                        stroke="#64748b"
                        strokeDasharray="3 3"
                    />

                    <ReferenceLine
                        y={production}
                        label={{ value: "Production Actuelle", position: 'insideTopLeft', fill: '#15803d', fontSize: 10 }}
                        stroke="#15803d"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                    />

                    <Area
                        type="monotone"
                        dataKey="prevu"
                        stroke="#94a3b8"
                        strokeDasharray="5 5"
                        fill="none"
                        name="Objectif (Linéaire)"
                        strokeWidth={2}
                    />
                    <Area
                        type="stepAfter"
                        dataKey="facture"
                        stackId="1"
                        stroke="#2563eb"
                        fill="#dbeafe"
                        name="Facturé (Cumul)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
