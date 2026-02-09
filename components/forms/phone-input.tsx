"use client"

import * as React from "react"
import { useState } from "react"
import { Phone, Check, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { validatePhone } from "@/utils/validators"

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  showValidation?: boolean
  showCountryCode?: boolean
  countryCode?: string
  onCountryCodeChange?: (code: string) => void
  onChange?: (value: string) => void
}

const countryCodes = [
  { code: "+20", country: "مصر", flag: "🇪🇬" },
  { code: "+966", country: "السعودية", flag: "🇸🇦" },
  { code: "+971", country: "الإمارات", flag: "🇦🇪" },
  { code: "+962", country: "الأردن", flag: "🇯🇴" },
  { code: "+965", country: "الكويت", flag: "🇰🇼" },
  { code: "+973", country: "البحرين", flag: "🇧🇭" },
  { code: "+974", country: "قطر", flag: "🇶🇦" },
  { code: "+968", country: "عُمان", flag: "🇴🇲" },
]

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      showValidation = true,
      showCountryCode = true,
      countryCode = "+20",
      onCountryCodeChange,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [isTouched, setIsTouched] = useState(false)
    const [selectedCode, setSelectedCode] = useState(countryCode)

    const phone = typeof value === "string" ? value : ""
    const isValid = validatePhone(phone)
    const showStatus = showValidation && isTouched && phone.length > 0

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow numbers
      const cleaned = e.target.value.replace(/\D/g, "")
      onChange?.(cleaned)
    }

    const handleCountryChange = (code: string) => {
      setSelectedCode(code)
      onCountryCodeChange?.(code)
    }

    // Format phone for display
    const formatDisplay = (phone: string) => {
      if (phone.length <= 3) return phone
      if (phone.length <= 7) return `${phone.slice(0, 3)} ${phone.slice(3)}`
      return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7, 11)}`
    }

    return (
      <div className="flex gap-2">
        {showCountryCode && (
          <Select value={selectedCode} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-[100px] flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {countryCodes.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span dir="ltr">{country.code}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1">
          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="tel"
            inputMode="numeric"
            className={cn(
              "pr-10 pl-10",
              showStatus && (isValid ? "border-green-500 focus-visible:ring-green-500" : "border-red-500 focus-visible:ring-red-500"),
              className
            )}
            ref={ref}
            value={formatDisplay(phone)}
            onChange={handlePhoneChange}
            onBlur={() => setIsTouched(true)}
            placeholder="01X XXXX XXXX"
            dir="ltr"
            maxLength={14}
            {...props}
          />
          {showStatus && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }

