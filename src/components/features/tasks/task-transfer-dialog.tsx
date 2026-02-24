"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCog } from "lucide-react"

interface TaskTransferDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onTransfer: (userId: string, reason: string) => void
    taskTitle: string
}

export function TaskTransferDialog({ open, onOpenChange, onTransfer, taskTitle }: TaskTransferDialogProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>("")
    const [reason, setReason] = useState("")
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            fetchUsers()
        }
    }, [open])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/users")
            if (res.ok) {
                const data = await res.json()
                setUsers(data)
            }
        } catch (error) {
            console.error("Failed to fetch users", error)
        } finally {
            setLoading(false)
        }
    }

    const handleTransfer = () => {
        if (selectedUserId && reason.trim()) {
            onTransfer(selectedUserId, reason)
            setSelectedUserId("")
            setReason("")
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Transfer Task</DialogTitle>
                    <DialogDescription>
                        Transfer <strong>{taskTitle}</strong> to another engineer
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="user">Assign To</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger id="user">
                                <SelectValue placeholder="Select an engineer" />
                            </SelectTrigger>
                            <SelectContent>
                                {loading ? (
                                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                    users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name} ({user.role})
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Reason for Transfer</Label>
                        <Textarea
                            id="reason"
                            placeholder="Explain why you're transferring this task..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleTransfer} disabled={!selectedUserId || !reason.trim()}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Transfer Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
