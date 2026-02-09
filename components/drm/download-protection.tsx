"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Lock, Shield, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface DownloadProtectionProps {
  fileUrl: string
  fileName: string
  allowDownload?: boolean
  requireAuth?: boolean
  expiryHours?: number
  maxDownloads?: number
  onDownloadAttempt?: (allowed: boolean) => void
}

export function DownloadProtection({
  fileUrl,
  fileName,
  allowDownload = false,
  requireAuth = true,
  expiryHours = 24,
  maxDownloads = 3,
  onDownloadAttempt,
}: DownloadProtectionProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadClick = () => {
    if (!allowDownload) {
      setShowDialog(true)
      onDownloadAttempt?.(false)
      return
    }

    // Simulate download with protection
    setIsDownloading(true)
    
    // Log download attempt
    console.log(`Download attempt: ${fileName}`)
    
    // Simulate generating protected download link
    setTimeout(() => {
      toast.success(`جاري تحميل: ${fileName}`)
      onDownloadAttempt?.(true)
      setIsDownloading(false)
      
      // In real implementation, would generate a signed URL with expiry
      // and track download count
    }, 1500)
  }

  return (
    <>
      <Button
        variant={allowDownload ? "default" : "secondary"}
        onClick={handleDownloadClick}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <span className="animate-spin ml-2">⏳</span>
        ) : allowDownload ? (
          <Download className="w-4 h-4 ml-2" />
        ) : (
          <Lock className="w-4 h-4 ml-2" />
        )}
        {allowDownload ? "تحميل" : "محمي"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              المحتوى محمي
            </DialogTitle>
            <DialogDescription>
              هذا الملف محمي ولا يمكن تحميله
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    لماذا لا يمكن التحميل؟
                  </p>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                    <li>• هذا المحتوى محمي بحقوق الملكية الفكرية</li>
                    <li>• يمكنك مشاهدته فقط داخل المنصة</li>
                    <li>• للحصول على نسخة، تواصل مع المسؤول</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">حالة الحماية</span>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">
                  <Lock className="w-3 h-3 ml-1" />
                  محمي
                </Badge>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDialog(false)}
            >
              فهمت
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
