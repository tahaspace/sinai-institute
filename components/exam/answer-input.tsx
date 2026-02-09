"use client"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { CheckCircle } from "lucide-react"

interface Option {
  id: string
  text: string
}

interface MultipleChoiceProps {
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
}

export function MultipleChoiceInput({
  options,
  value,
  onChange,
  disabled = false,
}: MultipleChoiceProps) {
  return (
    <RadioGroup value={value || ""} onValueChange={onChange} disabled={disabled}>
      <div className="space-y-3">
        {options.map((option, index) => (
          <div
            key={option.id}
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
              value === option.id
                ? "border-primary bg-primary/5"
                : "border-transparent bg-muted/50 hover:bg-muted"
            )}
            onClick={() => !disabled && onChange(option.id)}
          >
            <RadioGroupItem value={option.id} id={option.id} />
            <Label
              htmlFor={option.id}
              className="flex-1 cursor-pointer text-base"
            >
              <span className="font-medium ml-2">
                {String.fromCharCode(65 + index)}.
              </span>
              {option.text}
            </Label>
            {value === option.id && (
              <CheckCircle className="w-5 h-5 text-primary" />
            )}
          </div>
        ))}
      </div>
    </RadioGroup>
  )
}

interface TrueFalseProps {
  value: boolean | null
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function TrueFalseInput({ value, onChange, disabled = false }: TrueFalseProps) {
  return (
    <div className="flex gap-4">
      <div
        className={cn(
          "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all cursor-pointer",
          value === true
            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
            : "border-transparent bg-muted/50 hover:bg-muted"
        )}
        onClick={() => !disabled && onChange(true)}
      >
        <CheckCircle
          className={cn(
            "w-6 h-6",
            value === true ? "text-green-500" : "text-gray-400"
          )}
        />
        <span className="text-lg font-medium">صح</span>
      </div>
      <div
        className={cn(
          "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all cursor-pointer",
          value === false
            ? "border-red-500 bg-red-50 dark:bg-red-950/20"
            : "border-transparent bg-muted/50 hover:bg-muted"
        )}
        onClick={() => !disabled && onChange(false)}
      >
        <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold">
          ✗
        </span>
        <span className="text-lg font-medium">خطأ</span>
      </div>
    </div>
  )
}

interface ShortAnswerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ShortAnswerInput({
  value,
  onChange,
  placeholder = "اكتب إجابتك هنا...",
  disabled = false,
}: ShortAnswerProps) {
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="text-lg py-6"
      />
      <p className="text-xs text-muted-foreground">
        الحد الأقصى: 200 حرف ({value.length}/200)
      </p>
    </div>
  )
}

interface EssayProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minWords?: number
  maxWords?: number
  disabled?: boolean
}

export function EssayInput({
  value,
  onChange,
  placeholder = "اكتب إجابتك التفصيلية هنا...",
  minWords = 50,
  maxWords = 500,
  disabled = false,
}: EssayProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[200px] text-base leading-relaxed"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {wordCount < minWords ? (
            <span className="text-yellow-600">
              الحد الأدنى: {minWords} كلمة (متبقي {minWords - wordCount})
            </span>
          ) : (
            <span className="text-green-600">✓ تم تجاوز الحد الأدنى</span>
          )}
        </span>
        <span
          className={cn(
            wordCount > maxWords && "text-red-600"
          )}
        >
          {wordCount}/{maxWords} كلمة
        </span>
      </div>
    </div>
  )
}
