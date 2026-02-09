"use client"

import * as React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CURRENCY } from "@/config/constants"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value?: number
  onChange?: (value: number) => void
  currency?: string
  currencySymbol?: string
  locale?: string
  allowNegative?: boolean
  decimalPlaces?: number
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      value = 0,
      onChange,
      currency = CURRENCY.code,
      currencySymbol = CURRENCY.symbol,
      locale = "ar-EG",
      allowNegative = false,
      decimalPlaces = 2,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState(() => formatValue(value))
    const [isFocused, setIsFocused] = useState(false)

    function formatValue(num: number): string {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(num)
    }

    function parseValue(str: string): number {
      // Remove all non-numeric characters except decimal point and minus
      let cleaned = str.replace(/[^\d.-]/g, "")
      
      // Handle negative
      if (!allowNegative) {
        cleaned = cleaned.replace(/-/g, "")
      }

      // Parse
      let num = parseFloat(cleaned)
      if (isNaN(num)) num = 0

      // Round to decimal places
      return parseFloat(num.toFixed(decimalPlaces))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setDisplayValue(inputValue)
    }

    const handleFocus = () => {
      setIsFocused(true)
      // Show raw number on focus
      setDisplayValue(value === 0 ? "" : value.toString())
    }

    const handleBlur = () => {
      setIsFocused(false)
      const parsed = parseValue(displayValue)
      onChange?.(parsed)
      setDisplayValue(formatValue(parsed))
    }

    // Sync external value changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatValue(value))
      }
    }, [value, isFocused])

    return (
      <div className="relative">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
          {currencySymbol}
        </span>
        <Input
          type="text"
          inputMode="decimal"
          className={cn(
            "pr-12 text-left",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          dir="ltr"
          {...props}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }

