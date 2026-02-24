"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { useRouter, useParams } from "next/navigation"

/* eslint-disable @next/next/no-img-element */

interface CompanySettings {
    logoUrl?: string
    companyName?: string
    slogan?: string
    address?: string
    city?: string
    postalCode?: string
    phone?: string
    email?: string
    rc?: string
    nif?: string
    nis?: string
    stats?: string
}

interface Project {
    name: string
    client?: string
    location?: string
    currencyUnit?: string
    currencyDecimals?: number
    quantityDecimals?: number
    taxRate?: number
    billingMode?: string
}

interface MarketLot {
    id: string
    code: string
    name: string
}

interface MarketArticle {
    code: string
    lot?: MarketLot
}

interface InvoiceItem {
    id: string
    designation: string
    unit: string
    unitPrice: number
    previousQuantity: number
    currentQuantity: number
    totalQuantity: number
    currentAmount: number
    article?: MarketArticle
}

interface Invoice {
    number: string
    date: string
    periodStart?: string
    periodEnd?: string
    status: string
    totalAmount: number
    project?: Project
    items: InvoiceItem[]
}

interface LotGroup {
    info: MarketLot
    items: InvoiceItem[]
    totalCurrentAmount: number
}

export default function InvoicePrintPage() {
    const params = useParams()
    const router = useRouter()
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [company, setCompany] = useState<CompanySettings | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchInvoice = useCallback(async () => {
        try {
            const res = await fetch(`/api/invoices/${params.invoiceId}`, { cache: 'no-store' })
            if (res.ok) {
                const data = await res.json()
                setInvoice(data)
            }
        } catch (error) {
            console.error("Failed to fetch invoice:", error)
        } finally {
            setLoading(false)
        }
    }, [params.invoiceId])

    useEffect(() => {
        if (params.invoiceId) {
            fetchInvoice()
            fetchCompanySettings()
        }
    }, [params.invoiceId, fetchInvoice])

    const fetchCompanySettings = async () => {
        try {
            const res = await fetch("/api/settings/company")
            if (res.ok) {
                const data = await res.json()
                setCompany(data)
            }
        } catch (error) {
            console.error("Failed to fetch company settings:", error)
        }
    }

    if (loading) return <div className="p-8 text-center">Chargement de la situation...</div>
    if (!invoice) return <div className="p-8 text-center text-red-500">Facture introuvable.</div>

    // Helper for formatting
    const currency = invoice.project?.currencyUnit || "DZD"
    const decimals = invoice.project?.currencyDecimals || 2

    const fmt = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", {
            style: "decimal",
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(amount) + " " + currency
    }

    const totalHT = invoice.totalAmount
    // Calculate Tax
    const taxRate = invoice.project?.taxRate || 19
    const taxAmount = totalHT * (taxRate / 100)
    const totalTTC = totalHT + taxAmount

    // Group items by Lot
    const lotsMap = new Map<string, LotGroup>()
    invoice.items.forEach((item) => {
        const lotId = item.article?.lot?.id
        if (!lotId || !item.article?.lot) return

        if (!lotsMap.has(lotId)) {
            lotsMap.set(lotId, {
                info: item.article.lot,
                items: [],
                totalCurrentAmount: 0
            })
        }

        const lotGroup = lotsMap.get(lotId)
        if (lotGroup) {
            lotGroup.items.push(item)
            lotGroup.totalCurrentAmount += item.currentAmount
        }
    })

    const lots = Array.from(lotsMap.values()).sort((a, b) => a.info.code.localeCompare(b.info.code))


    const quantityDecimals = invoice.project?.quantityDecimals ?? 3

    const billingMode = invoice.project?.billingMode || "HT"

    return (
        <div className="min-h-screen bg-white text-black p-8 max-w-[210mm] mx-auto print:p-0 print:max-w-none">

            {/* NO-PRINT CONTROLS */}
            <div className="mb-8 flex justify-between items-center print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimer / PDF
                    </Button>
                </div>
            </div>

            {/* HEADER */}
            <header className="mb-8 border-b pb-4">
                <div className="flex justify-between items-start mb-6">
                    {/* LEFT: Logo & Company Info */}
                    <div className="flex gap-4">
                        {company?.logoUrl && (
                            <img
                                src={company.logoUrl}
                                alt="Company Logo"
                                className="w-24 h-24 object-contain"
                            />
                        )}
                        <div>
                            <h2 className="text-xl font-bold uppercase">{company?.companyName || "Nom de l'Entreprise"}</h2>
                            {company?.slogan && <p className="text-sm italic text-gray-600 mb-2">{company.slogan}</p>}

                            <div className="text-xs text-gray-700 space-y-1">
                                <p>{company?.address} {company?.city} {company?.postalCode}</p>
                                <p>
                                    {[
                                        company?.phone && `Tél: ${company.phone}`,
                                        company?.email && `Email: ${company.email}`
                                    ].filter(Boolean).join(' | ')}
                                </p>
                                <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                                    {company?.rc && <span>RC: {company.rc}</span>}
                                    {company?.nif && <span>NIF: {company.nif}</span>}
                                    {company?.nis && <span>NIS: {company.nis}</span>}
                                    {company?.stats && <span>ART: {company.stats}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Invoice Details */}
                    <div className="text-right">
                        <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">État de Situation n° {invoice.number}</h1>
                        <p className="text-sm text-gray-600">Date: {new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
                        {invoice.periodStart && invoice.periodEnd && (
                            <p className="text-sm text-gray-600">
                                Période: du {new Date(invoice.periodStart).toLocaleDateString('fr-FR')} au {new Date(invoice.periodEnd).toLocaleDateString('fr-FR')}
                            </p>
                        )}
                        <div className="mt-4 bg-gray-100 p-2 rounded inline-block text-left min-w-[150px]">
                            <p className="text-xs text-gray-500 uppercase">Projet</p>
                            <p className="font-bold text-sm">{invoice.project?.name}</p>
                            <p className="text-xs text-gray-600">{invoice.project?.client}</p>
                            <p className="text-xs text-gray-600">{invoice.project?.location}</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-end">
                    <div className="bg-gray-100 p-2 rounded">
                        <span className="text-xs text-gray-500 uppercase mr-2">Statut:</span>
                        {invoice.status === 'PAID' ? (
                            <span className="font-bold text-green-700">COMPTABILISÉE</span>
                        ) : invoice.status === 'VALIDATED' ? (
                            <span className="font-bold text-blue-700">VALIDÉE</span>
                        ) : (
                            <span className="font-bold text-orange-600">PROVISOIRE</span>
                        )}
                    </div>
                </div>
            </header>

            {/* CONTENT TABLE */}
            <div className="space-y-6">
                {lots.map((lot) => (
                    <div key={lot.info.id} className="break-inside-avoid">
                        {/* LOT HEADER */}
                        <div className="bg-gray-200 p-2 font-bold flex justify-between items-center text-sm border-t border-b border-black">
                            <span>{lot.info.code} - {lot.info.name}</span>
                            <span>Total Lot: {fmt(lot.totalCurrentAmount)}</span>
                        </div>

                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-gray-300 bg-gray-50">
                                    <th className="p-1 text-left w-16">Code</th>
                                    <th className="p-1 text-left">Désignation</th>
                                    <th className="p-1 text-center w-8">U</th>
                                    <th className="p-1 text-right w-20">P.U.</th>
                                    <th className="p-1 text-right w-16 text-gray-500">Q. Préc</th>
                                    <th className="p-1 text-right w-16 font-bold">Q. Mois</th>
                                    <th className="p-1 text-right w-16">Q. Cumul</th>
                                    <th className="p-1 text-right w-24 font-bold bg-gray-100">Montant (Mois)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lot.items.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-100">
                                        <td className="p-1">{item.article?.code}</td>
                                        <td className="p-1">{item.designation}</td>
                                        <td className="p-1 text-center">{item.unit}</td>
                                        <td className="p-1 text-right">{fmt(item.unitPrice)}</td>

                                        {/* Quantities */}
                                        <td className="p-1 text-right text-gray-500">{item.previousQuantity.toFixed(quantityDecimals)}</td>
                                        <td className="p-1 text-right font-bold">{item.currentQuantity.toFixed(quantityDecimals)}</td>
                                        <td className="p-1 text-right">{item.totalQuantity.toFixed(quantityDecimals)}</td>

                                        {/* Amounts - Showing Current Amount as main billing value */}
                                        <td className="p-1 text-right font-bold bg-gray-50">
                                            {fmt(item.currentAmount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            {/* GRAND TOTAL */}
            <div className="mt-8 border-t-2 border-black pt-4 break-inside-avoid">
                <div className="flex justify-end">
                    <div className="w-64">
                        <div className="flex justify-between items-center py-1">
                            <span className="font-bold">Total Général (HT)</span>
                            <span className="font-bold text-lg">{fmt(totalHT)}</span>
                        </div>
                        {billingMode === "TTC" && (
                            <>
                                <div className="flex justify-between items-center py-1 text-gray-600">
                                    <span>TVA ({taxRate}%)</span>
                                    <span>{fmt(taxAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-t border-black mt-2">
                                    <span className="font-bold text-xl">Total TTC</span>
                                    <span className="font-bold text-xl">{fmt(totalTTC)}</span>
                                </div>
                            </>
                        )}
                        {billingMode === "HT" && (
                            <div className="flex justify-between items-center py-2 border-t border-gray-300 mt-2">
                                <span className="font-bold">Net à Payer</span>
                                <span className="font-bold">{fmt(totalHT)}</span>
                            </div>
                        )}
                    </div>
                </div>
                {/* Total in words placeholder */}
                <div className="mt-4 italic text-sm text-gray-600 border-t pt-2">
                    Arrêté la présente situation à la somme de : ....................................................................
                </div>
            </div>

            {/* SIGNATURES */}
            <div className="mt-16 grid grid-cols-3 gap-8 break-inside-avoid">
                <div className="border border-gray-300 h-32 p-4">
                    <p className="text-xs font-bold uppercase mb-2">L&apos;Entreprise {company?.companyName ? `(${company.companyName})` : ''}</p>
                </div>
                <div className="border border-gray-300 h-32 p-4">
                    <p className="text-xs font-bold uppercase mb-2">Bureau d&apos;Études / Contrôle</p>
                </div>
                <div className="border border-gray-300 h-32 p-4">
                    <p className="text-xs font-bold uppercase mb-2">Maître d&apos;Ouvrage</p>
                </div>
            </div>
        </div>
    )
}
