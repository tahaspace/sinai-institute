"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  showButtons?: boolean
  allowDecimals?: boolean
  decimalPlaces?: number
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value = 0,
      onChange,
      min = -Infinity,
      max = Infinity,
      step = 1,
      showButtons = true,
      allowDecimals = false,
      decimalPlaces = 2,
      disabled,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value

      // Remove non-numeric characters except decimal point
      if (allowDecimals) {
        newValue = newValue.replace(/[^\d.-]/g, "")
      } else {
        newValue = newValue.replace(/[^\d-]/g, "")
      }

      // Parse the value
      let numValue = allowDecimals ? parseFloat(newValue) : parseInt(newValue, 10)

      // Handle NaN
      if (isNaN(numValue)) {
        numValue = 0
      }

      // Clamp to min/max
      numValue = Math.max(min, Math.min(max, numValue))

      // Round decimals if needed
      if (allowDecimals) {
        numValue = parseFloat(numValue.toFixed(decimalPlaces))
      }

      onChange?.(numValue)
    }

    const increment = () => {
      const newValue = Math.min(max, value + step)
      onChange?.(allowDecimals ? parseFloat(newValue.toFixed(decimalPlaces)) : newValue)
    }

    const decrement = () => {
      const newValue = Math.max(min, value - step)
      onChange?.(allowDecimals ? parseFloat(newValue.toFixed(decimalPlaces)) : newValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault()
        increment()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        decrement()
      }
    }

    return (
      <div className="flex">
        {showButtons && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-l-none border-l-0"
            onClick={decrement}
            disabled={disabled || value <= min}
            tabIndex={-1}
          >
            <Minus className="h-4 w-4" />
          </Button>
        )}
        <Input
          type="text"
          inputMode={allowDecimals ? "decimal" : "numeric"}
          className={cn(
            "text-center",
            showButtons && "rounded-none",
            className
          )}
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          dir="ltr"
          {...props}
        />
        {showButtons && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-r-none border-r-0"
            onClick={increment}
            disabled={disabled || value >= max}
            tabIndex={-1}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }

