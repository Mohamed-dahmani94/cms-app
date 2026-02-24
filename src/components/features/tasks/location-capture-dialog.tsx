"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MapPin, Camera, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface LocationCaptureDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCapture: (latitude: number, longitude: number, photoUrl?: string) => void
    taskTitle: string
}

export function LocationCaptureDialog({ open, onOpenChange, onCapture, taskTitle }: LocationCaptureDialogProps) {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [photoUrl, setPhotoUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const captureLocation = () => {
        setLoading(true)
        setError(null)

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser")
            setLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
                setLoading(false)
            },
            (error) => {
                setError(`Error: ${error.message}`)
                setLoading(false)
            }
        )
    }

    const capturePhoto = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            const video = document.createElement('video')
            video.srcObject = stream
            video.play()

            // Wait for video to be ready
            await new Promise(resolve => {
                video.onloadedmetadata = resolve
            })

            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            canvas.getContext('2d')?.drawImage(video, 0, 0)

            const photoDataUrl = canvas.toDataURL('image/jpeg')
            setPhotoUrl(photoDataUrl)

            // Stop the stream
            stream.getTracks().forEach(track => track.stop())
        } catch (error) {
            setError("Camera access denied or not available")
        }
    }

    const handleSave = () => {
        if (location) {
            onCapture(location.lat, location.lng, photoUrl || undefined)
            setLocation(null)
            setPhotoUrl(null)
            setError(null)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Capture Location & Photo</DialogTitle>
                    <DialogDescription>
                        Record your location and optionally take a photo for: <strong>{taskTitle}</strong>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>GPS Location</Label>
                        <Button
                            onClick={captureLocation}
                            disabled={loading}
                            variant={location ? "secondary" : "default"}
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Getting Location...</>
                            ) : location ? (
                                <><MapPin className="mr-2 h-4 w-4" /> Location Captured</>
                            ) : (
                                <><MapPin className="mr-2 h-4 w-4" /> Capture Location</>
                            )}
                        </Button>
                        {location && (
                            <div className="text-sm text-gray-500">
                                <Badge variant="outline" className="mr-2">
                                    Lat: {location.lat.toFixed(6)}
                                </Badge>
                                <Badge variant="outline">
                                    Lng: {location.lng.toFixed(6)}
                                </Badge>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Site Photo (Optional)</Label>
                        <Button
                            onClick={capturePhoto}
                            variant={photoUrl ? "secondary" : "outline"}
                        >
                            {photoUrl ? (
                                <><Camera className="mr-2 h-4 w-4" /> Photo Captured</>
                            ) : (
                                <><Camera className="mr-2 h-4 w-4" /> Take Photo</>
                            )}
                        </Button>
                        {photoUrl && (
                            <img src={photoUrl} alt="Site" className="w-full h-32 object-cover rounded" />
                        )}
                    </div>

                    {error && (
                        <div className="text-sm text-red-500">{error}</div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!location}>
                        Save Location
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
