"use client"

import * as React from "react"
import { useState } from "react"
import { Mail, Check, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { validateEmail } from "@/utils/validators"

interface EmailInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showValidation?: boolean
}

const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ className, showValidation = true, value, onChange, ...props }, ref) => {
    const [isTouched, setIsTouched] = useState(false)

    const email = typeof value === "string" ? value : ""
    const isValid = validateEmail(email)
    const showStatus = showValidation && isTouched && email.length > 0

    return (
      <div className="relative">
        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="email"
          className={cn(
            "pr-10 pl-10",
            showStatus && (isValid ? "border-green-500 focus-visible:ring-green-500" : "border-red-500 focus-visible:ring-red-500"),
            className
          )}
          ref={ref}
          value={value}
          onChange={onChange}
          onBlur={() => setIsTouched(true)}
          dir="ltr"
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
    )
  }
)
EmailInput.displayName = "EmailInput"

export { EmailInput }

