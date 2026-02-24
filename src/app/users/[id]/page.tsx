"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function EditUserPage({ params }: { params: { id: string } }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("ENGINEER");
    const [specialty, setSpecialty] = useState("");

    useEffect(() => {
        if (status === "authenticated") {
            fetch(`/api/users/${params.id}`)
                .then((res) => res.json())
                .then((data) => {
                    setName(data.name);
                    setEmail(data.email);
                    setRole(data.role);
                    setSpecialty(data.specialty || "");
                    setLoading(false);
                })
                .catch(console.error);
        }
    }, [status, params.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        const res = await fetch(`/api/users/${params.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                email,
                role,
                specialty
            }),
        });

        if (res.ok) {
            router.push("/users");
        } else {
            console.error("Failed to update user", await res.text());
        }
    };

    if (status === "loading" || loading) return <p>Loading...</p>;
    if (!session || session.user.role !== "ADMIN") return <p>Accès refusé.</p>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="mb-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
            </div>
            <h1 className="text-2xl font-bold mb-4">Modifier l'utilisateur</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">Nom complet</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="role">Rôle</Label>
                    <Select onValueChange={setRole} value={role}>
                        <SelectTrigger id="role">
                            <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="PROJECT_MANAGER">Chef de projet</SelectItem>
                            <SelectItem value="ENGINEER">Ingénieur</SelectItem>
                            <SelectItem value="DAILY_WORKER">Ouvrier journalier</SelectItem>
                            <SelectItem value="PIECEWORKER">Tâcheron</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="specialty">Spécialité (Optionnel)</Label>
                    <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">
                    Mettre à jour l'utilisateur
                </Button>
            </form>
        </div>
    );
}
