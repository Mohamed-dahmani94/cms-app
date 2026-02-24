"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText } from "lucide-react"

interface PVUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpload: (file: File) => void
    taskTitle: string
}

export function PVUploadDialog({ open, onOpenChange, onUpload, taskTitle }: PVUploadDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleUpload = () => {
        if (selectedFile) {
            onUpload(selectedFile)
            setSelectedFile(null)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Upload PV (Procès-Verbal)</DialogTitle>
                    <DialogDescription>
                        Upload proof of completion for: <strong>{taskTitle}</strong>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="pv-file">PV Document</Label>
                        <Input
                            id="pv-file"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                        />
                        {selectedFile && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{selectedFile.name}</span>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={!selectedFile}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload & Complete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
