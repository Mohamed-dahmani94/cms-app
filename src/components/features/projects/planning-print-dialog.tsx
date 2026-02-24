"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Printer } from "lucide-react"

interface PlanningPrintDialogProps {
    projectId: string
}

export function PlanningPrintDialog({ projectId }: PlanningPrintDialogProps) {
    const [open, setOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'global' | 'detailed'>('detailed')
    const [dateMode, setDateMode] = useState<'theoretical' | 'real' | 'both'>('both')

    const handlePrint = () => {
        const url = `/projects/${projectId}/planning/print?view=${viewMode}&date=${dateMode}`
        window.open(url, '_blank')
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Imprimer le Planning</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-3">
                        <Label className="text-base">Niveau de détail</Label>
                        <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="global" id="view-global" />
                                <Label htmlFor="view-global">Global (Phases & Lots uniquement)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="detailed" id="view-detailed" />
                                <Label htmlFor="view-detailed">Détaillé (Avec tâches et sous-tâches)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-base">Dates à afficher</Label>
                        <RadioGroup value={dateMode} onValueChange={(v) => setDateMode(v as any)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="both" id="date-both" />
                                <Label htmlFor="date-both">Les deux (Théorique & Réel)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="theoretical" id="date-theo" />
                                <Label htmlFor="date-theo">Théorique uniquement</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="real" id="date-real" />
                                <Label htmlFor="date-real">Réel uniquement</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" />
                        Lancer l'impression
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
