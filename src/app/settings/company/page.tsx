"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Building2, Upload, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function CompanySettingsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Form states
    const [companyName, setCompanyName] = useState("")
    const [slogan, setSlogan] = useState("")
    const [nif, setNif] = useState("")
    const [rc, setRc] = useState("")
    const [nis, setNis] = useState("")
    const [stats, setStats] = useState("")
    const [address, setAddress] = useState("")
    const [city, setCity] = useState("")
    const [postalCode, setPostalCode] = useState("")
    const [phone, setPhone] = useState("")
    const [email, setEmail] = useState("")
    const [website, setWebsite] = useState("")
    const [logoUrl, setLogoUrl] = useState("")

    // Redirect if not admin
    useEffect(() => {
        if (status === "loading") return
        if (!session || session.user.role !== "ADMIN") {
            router.push("/")
        }
    }, [session, status, router])

    // Fetch company settings
    useEffect(() => {
        if (!session || session.user.role !== "ADMIN") return

        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/settings/company")
                if (res.ok) {
                    const data = await res.json()
                    setCompanyName(data.companyName || "")
                    setSlogan(data.slogan || "")
                    setNif(data.nif || "")
                    setRc(data.rc || "")
                    setNis(data.nis || "")
                    setStats(data.stats || "")
                    setAddress(data.address || "")
                    setCity(data.city || "")
                    setPostalCode(data.postalCode || "")
                    setPhone(data.phone || "")
                    setEmail(data.email || "")
                    setWebsite(data.website || "")
                    setLogoUrl(data.logoUrl || "")
                }
            } catch (error) {
                console.error("Failed to fetch settings", error)
            } finally {
                setLoading(false)
            }
        }

        fetchSettings()
    }, [session])

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("logo", file)

            const res = await fetch("/api/upload/logo", {
                method: "POST",
                body: formData
            })

            if (res.ok) {
                const data = await res.json()
                setLogoUrl(data.url)
            } else {
                const errorData = await res.json()
                alert(`Erreur: ${errorData.error}`)
            }
        } catch (error) {
            console.error("Logo upload failed", error)
            alert("Échec de l'upload du logo")
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!companyName.trim()) {
            alert("Le nom de l'entreprise est obligatoire")
            return
        }

        setSaving(true)
        try {
            const res = await fetch("/api/settings/company", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName,
                    slogan,
                    nif,
                    rc,
                    nis,
                    stats,
                    address,
                    city,
                    postalCode,
                    phone,
                    email,
                    website,
                    logoUrl
                })
            })

            if (res.ok) {
                alert("Paramètres enregistrés avec succès !")
            } else {
                const errorData = await res.json()
                alert(`Erreur: ${errorData.error}`)
            }
        } catch (error) {
            console.error("Save failed", error)
            alert("Échec de l'enregistrement")
        } finally {
            setSaving(false)
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!session || session.user.role !== "ADMIN") {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-6 w-6" />
                        <h1 className="text-3xl font-bold">Paramètres de l'Entreprise</h1>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Logo Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Logo de l'Entreprise</CardTitle>
                            <CardDescription>
                                Le logo apparaîtra sur les documents imprimables (factures, rapports)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {logoUrl && (
                                <div className="flex justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded">
                                    <Image
                                        src={logoUrl}
                                        alt="Company Logo"
                                        width={200}
                                        height={100}
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            <div>
                                <Label htmlFor="logo">Télécharger un nouveau logo</Label>
                                <Input
                                    id="logo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                    className="mt-1"
                                />
                                {uploading && (
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Upload en cours...
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    Formats acceptés: JPEG, PNG, WebP, SVG (Max 5MB)
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations de Base</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="companyName">Nom de l'Entreprise *</Label>
                                <Input
                                    id="companyName"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                    placeholder="SARL CONSTRUCTION"
                                />
                            </div>
                            <div>
                                <Label htmlFor="slogan">Slogan / Description</Label>
                                <Input
                                    id="slogan"
                                    value={slogan}
                                    onChange={(e) => setSlogan(e.target.value)}
                                    placeholder="Votre partenaire de confiance"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tax Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations Fiscales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="nif">NIF (Numéro d'Identification Fiscale)</Label>
                                <Input
                                    id="nif"
                                    value={nif}
                                    onChange={(e) => setNif(e.target.value)}
                                    placeholder="000000000000000"
                                />
                            </div>
                            <div>
                                <Label htmlFor="rc">RC (Registre de Commerce)</Label>
                                <Input
                                    id="rc"
                                    value={rc}
                                    onChange={(e) => setRc(e.target.value)}
                                    placeholder="00/00-0000000"
                                />
                            </div>
                            <div>
                                <Label htmlFor="nis">NIS (Numéro d'Identification Statistique)</Label>
                                <Input
                                    id="nis"
                                    value={nis}
                                    onChange={(e) => setNis(e.target.value)}
                                    placeholder="000000000000000"
                                />
                            </div>
                            <div>
                                <Label htmlFor="stats">Numéro Statistique</Label>
                                <Input
                                    id="stats"
                                    value={stats}
                                    onChange={(e) => setStats(e.target.value)}
                                    placeholder="000000"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Coordonnées</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="address">Adresse</Label>
                                <Input
                                    id="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="123 Rue Exemple"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="city">Ville</Label>
                                    <Input
                                        id="city"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="Alger"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="postalCode">Code Postal</Label>
                                    <Input
                                        id="postalCode"
                                        value={postalCode}
                                        onChange={(e) => setPostalCode(e.target.value)}
                                        placeholder="16000"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="phone">Téléphone</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+213 123 456 789"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="contact@entreprise.dz"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="website">Site Web</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    placeholder="https://www.entreprise.dz"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" asChild>
                            <Link href="/">Annuler</Link>
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                "Enregistrer"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
