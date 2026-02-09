"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { 
  Upload, 
  X, 
  File, 
  Image, 
  FileText, 
  Film,
  Music,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatFileSize } from "@/utils/formatters"
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES } from "@/config/constants"

interface FileUploadProps {
  onFilesChange?: (files: File[]) => void
  onUpload?: (files: File[]) => Promise<void>
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  disabled?: boolean
  className?: string
  showPreview?: boolean
  variant?: "default" | "avatar" | "document"
}

interface UploadedFile {
  file: File
  id: string
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  error?: string
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image
  if (type.startsWith("video/")) return Film
  if (type.startsWith("audio/")) return Music
  if (type.includes("pdf") || type.includes("document")) return FileText
  return File
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  (
    {
      onFilesChange,
      onUpload,
      accept = "image/*,application/pdf,.doc,.docx",
      multiple = true,
      maxSize = MAX_FILE_SIZE,
      maxFiles = 5,
      disabled = false,
      className,
      showPreview = true,
      variant = "default",
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<UploadedFile[]>([])
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!)

    const validateFile = useCallback((file: File): string | null => {
      if (file.size > maxSize) {
        return `حجم الملف يتجاوز ${formatFileSize(maxSize)}`
      }
      return null
    }, [maxSize])

    const addFiles = useCallback((newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      
      // Limit number of files
      const availableSlots = maxFiles - files.length
      const filesToAdd = fileArray.slice(0, availableSlots)

      const uploadedFiles: UploadedFile[] = filesToAdd.map((file) => {
        const error = validateFile(file)
        return {
          file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          progress: 0,
          status: error ? "error" : "pending",
          error: error || undefined,
        }
      })

      setFiles((prev) => [...prev, ...uploadedFiles])
      onFilesChange?.(filesToAdd)
    }, [files.length, maxFiles, validateFile, onFilesChange])

    const removeFile = useCallback((id: string) => {
      setFiles((prev) => prev.filter((f) => f.id !== id))
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    }, [disabled])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      
      if (disabled) return
      
      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles)
      }
    }, [disabled, addFiles])

    const handleClick = () => {
      if (!disabled) {
        inputRef.current?.click()
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        addFiles(selectedFiles)
      }
      // Reset input
      e.target.value = ""
    }

    const handleUpload = async () => {
      if (!onUpload) return

      const pendingFiles = files.filter((f) => f.status === "pending")
      
      for (const uploadedFile of pendingFiles) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: "uploading" } : f
          )
        )

        try {
          // Simulate progress
          for (let i = 0; i <= 100; i += 10) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id ? { ...f, progress: i } : f
              )
            )
          }

          await onUpload([uploadedFile.file])

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? { ...f, status: "success", progress: 100 }
                : f
            )
          )
        } catch {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? { ...f, status: "error", error: "فشل في الرفع" }
                : f
            )
          )
        }
      }
    }

    return (
      <div className={cn("space-y-4", className)}>
        {/* Drop Zone */}
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isDragging ? "bg-primary/10" : "bg-muted"
            )}>
              <Upload className={cn(
                "w-6 h-6",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="font-medium">
                {isDragging ? "أفلت الملفات هنا" : "اسحب الملفات هنا أو اضغط للاختيار"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                الحد الأقصى: {formatFileSize(maxSize)} لكل ملف
                {multiple && ` • حتى ${maxFiles} ملفات`}
              </p>
            </div>
          </div>
        </div>

        {/* File List */}
        {showPreview && files.length > 0 && (
          <div className="space-y-2">
            {files.map((uploadedFile) => {
              const FileIcon = getFileIcon(uploadedFile.file.type)
              
              return (
                <div
                  key={uploadedFile.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    uploadedFile.status === "error" && "border-red-200 bg-red-50",
                    uploadedFile.status === "success" && "border-green-200 bg-green-50"
                  )}
                >
                  {/* Preview or Icon */}
                  {uploadedFile.file.type.startsWith("image/") ? (
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={URL.createObjectURL(uploadedFile.file)}
                        alt={uploadedFile.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <FileIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {uploadedFile.status === "uploading" && (
                      <Progress value={uploadedFile.progress} className="h-1 mt-1" />
                    )}
                    
                    {/* Error Message */}
                    {uploadedFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                    )}
                  </div>

                  {/* Status/Actions */}
                  <div className="flex-shrink-0">
                    {uploadedFile.status === "uploading" && (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    )}
                    {uploadedFile.status === "success" && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {uploadedFile.status === "error" && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    {(uploadedFile.status === "pending" || uploadedFile.status === "error") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFile(uploadedFile.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Upload Button */}
        {onUpload && files.some((f) => f.status === "pending") && (
          <Button onClick={handleUpload} className="w-full">
            <Upload className="w-4 h-4 ml-2" />
            رفع الملفات
          </Button>
        )}
      </div>
    )
  }
)
FileUpload.displayName = "FileUpload"

export { FileUpload }

