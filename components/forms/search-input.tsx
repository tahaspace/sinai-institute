"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onSearch?: (value: string) => void
  onClear?: () => void
  debounceMs?: number
  isLoading?: boolean
  showClear?: boolean
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      onSearch,
      onClear,
      debounceMs = 300,
      isLoading = false,
      showClear = true,
      placeholder = "بحث...",
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useState("")
    const debouncedValue = useDebounce(value, debounceMs)

    // Trigger search on debounced value change
    React.useEffect(() => {
      if (onSearch) {
        onSearch(debouncedValue)
      }
    }, [debouncedValue, onSearch])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
    }, [])

    const handleClear = useCallback(() => {
      setValue("")
      onClear?.()
    }, [onClear])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
          handleClear()
        }
      },
      [handleClear]
    )

    return (
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          type="search"
          className={cn(
            "pr-10",
            showClear && value && "pl-10",
            className
          )}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          ref={ref}
          {...props}
        />
        {showClear && value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
            onClick={handleClear}
            tabIndex={-1}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }

