"use client"

import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff, Lock, Check, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { validatePassword, getPasswordStrength } from "@/utils/validators"

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showStrength?: boolean
  showRequirements?: boolean
  label?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, showRequirements = false, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const password = typeof value === "string" ? value : ""
    const validation = validatePassword(password)
    const strength = getPasswordStrength(validation.score)

    const requirements = [
      { label: "8 أحرف على الأقل", met: password.length >= 8 },
      { label: "حرف كبير", met: /[A-Z]/.test(password) },
      { label: "حرف صغير", met: /[a-z]/.test(password) },
      { label: "رقم", met: /\d/.test(password) },
      { label: "رمز خاص", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ]

    return (
      <div className="w-full space-y-2">
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10 pl-10", className)}
            ref={ref}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Strength Indicator */}
        {showStrength && password.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    validation.score >= level
                      ? level <= 2
                        ? "bg-red-500"
                        : level <= 3
                        ? "bg-yellow-500"
                        : level <= 4
                        ? "bg-blue-500"
                        : "bg-green-500"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className={cn("text-xs", strength.color)}>
              قوة كلمة المرور: {strength.labelAr}
            </p>
          </div>
        )}

        {/* Requirements List */}
        {showRequirements && isFocused && password.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            {requirements.map((req, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  req.met ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {req.met ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }

