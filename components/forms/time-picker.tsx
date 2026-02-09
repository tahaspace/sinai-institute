"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { Clock, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string // HH:mm format
  onChange?: (time: string) => void
  format?: "12" | "24"
  minuteStep?: number
  disabled?: boolean
  placeholder?: string
  className?: string
}

const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      value = "",
      onChange,
      format = "12",
      minuteStep = 5,
      disabled = false,
      placeholder = "اختر الوقت",
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    
    // Parse value or use defaults
    const parseTime = (timeStr: string) => {
      if (!timeStr) return { hours: 12, minutes: 0, period: "AM" as const }
      
      const [h, m] = timeStr.split(":").map(Number)
      
      if (format === "12") {
        const period = h >= 12 ? "PM" : "AM"
        const hours = h % 12 || 12
        return { hours, minutes: m || 0, period }
      }
      
      return { hours: h || 0, minutes: m || 0, period: "AM" as const }
    }

    const { hours, minutes, period } = parseTime(value)
    const [selectedHours, setSelectedHours] = useState(hours)
    const [selectedMinutes, setSelectedMinutes] = useState(minutes)
    const [selectedPeriod, setSelectedPeriod] = useState(period)

    const formatTime = useCallback((h: number, m: number, p: "AM" | "PM") => {
      if (format === "24") {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      }
      
      let hour24 = h
      if (p === "PM" && h !== 12) hour24 = h + 12
      if (p === "AM" && h === 12) hour24 = 0
      
      return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    }, [format])

    const displayTime = useCallback(() => {
      if (!value) return ""
      
      const { hours, minutes, period } = parseTime(value)
      
      if (format === "12") {
        return `${hours}:${String(minutes).padStart(2, "0")} ${period === "AM" ? "ص" : "م"}`
      }
      
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    }, [value, format])

    const updateTime = useCallback((h: number, m: number, p: "AM" | "PM") => {
      const formatted = formatTime(h, m, p)
      onChange?.(formatted)
    }, [formatTime, onChange])

    const incrementHours = () => {
      const maxHours = format === "12" ? 12 : 23
      const newHours = selectedHours >= maxHours ? (format === "12" ? 1 : 0) : selectedHours + 1
      setSelectedHours(newHours)
      updateTime(newHours, selectedMinutes, selectedPeriod)
    }

    const decrementHours = () => {
      const newHours = selectedHours <= (format === "12" ? 1 : 0) ? (format === "12" ? 12 : 23) : selectedHours - 1
      setSelectedHours(newHours)
      updateTime(newHours, selectedMinutes, selectedPeriod)
    }

    const incrementMinutes = () => {
      const newMinutes = (selectedMinutes + minuteStep) % 60
      setSelectedMinutes(newMinutes)
      updateTime(selectedHours, newMinutes, selectedPeriod)
    }

    const decrementMinutes = () => {
      const newMinutes = selectedMinutes < minuteStep ? 60 - minuteStep : selectedMinutes - minuteStep
      setSelectedMinutes(newMinutes)
      updateTime(selectedHours, newMinutes, selectedPeriod)
    }

    const togglePeriod = () => {
      const newPeriod = selectedPeriod === "AM" ? "PM" : "AM"
      setSelectedPeriod(newPeriod)
      updateTime(selectedHours, selectedMinutes, newPeriod)
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={ref}
              readOnly
              value={displayTime()}
              placeholder={placeholder}
              disabled={disabled}
              className={cn("pr-10 cursor-pointer", className)}
              onClick={() => !disabled && setIsOpen(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex items-center gap-4">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={incrementHours}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-2xl font-bold w-12 text-center">
                {String(selectedHours).padStart(2, "0")}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={decrementHours}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">ساعة</span>
            </div>

            <span className="text-2xl font-bold">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={incrementMinutes}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-2xl font-bold w-12 text-center">
                {String(selectedMinutes).padStart(2, "0")}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={decrementMinutes}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">دقيقة</span>
            </div>

            {/* AM/PM for 12-hour format */}
            {format === "12" && (
              <div className="flex flex-col items-center mr-2">
                <Button
                  type="button"
                  variant={selectedPeriod === "AM" ? "default" : "outline"}
                  size="sm"
                  className="mb-1"
                  onClick={() => {
                    setSelectedPeriod("AM")
                    updateTime(selectedHours, selectedMinutes, "AM")
                  }}
                >
                  ص
                </Button>
                <Button
                  type="button"
                  variant={selectedPeriod === "PM" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedPeriod("PM")
                    updateTime(selectedHours, selectedMinutes, "PM")
                  }}
                >
                  م
                </Button>
              </div>
            )}
          </div>

          {/* Quick Select */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">اختيار سريع</p>
            <div className="flex flex-wrap gap-1">
              {["08:00", "09:00", "12:00", "14:00", "17:00", "20:00"].map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    onChange?.(time)
                    const parsed = parseTime(time)
                    setSelectedHours(parsed.hours)
                    setSelectedMinutes(parsed.minutes)
                    setSelectedPeriod(parsed.period)
                    setIsOpen(false)
                  }}
                >
                  {format === "12" ? 
                    `${parseInt(time.split(":")[0]) % 12 || 12}:${time.split(":")[1]} ${parseInt(time.split(":")[0]) >= 12 ? "م" : "ص"}` 
                    : time
                  }
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)
TimePicker.displayName = "TimePicker"

export { TimePicker }

