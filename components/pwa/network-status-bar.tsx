"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff, Signal, SignalLow, SignalZero } from "lucide-react"
import { cn } from "@/lib/utils"
import { getNetworkInfo, observeNetworkStatus, type NetworkStatus, type NetworkInfo } from "@/lib/pwa"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface NetworkStatusBarProps {
  showDetails?: boolean
  className?: string
}

export function NetworkStatusBar({ showDetails = true, className }: NetworkStatusBarProps) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ status: "online" })

  useEffect(() => {
    // Get initial info
    setNetworkInfo(getNetworkInfo())

    // Observe changes
    const cleanup = observeNetworkStatus((status) => {
      setNetworkInfo(getNetworkInfo())
    })

    return cleanup
  }, [])

  const getIcon = () => {
    if (networkInfo.status === "offline") {
      return <WifiOff className="h-4 w-4" />
    }

    switch (networkInfo.effectiveType) {
      case "slow-2g":
        return <SignalZero className="h-4 w-4" />
      case "2g":
        return <SignalLow className="h-4 w-4" />
      case "3g":
        return <Signal className="h-4 w-4" />
      case "4g":
        return <Wifi className="h-4 w-4" />
      default:
        return <Wifi className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    if (networkInfo.status === "offline") return "text-red-500"
    if (networkInfo.status === "slow") return "text-yellow-500"
    return "text-green-500"
  }

  const getStatusText = () => {
    if (networkInfo.status === "offline") return "غير متصل"
    if (networkInfo.status === "slow") return "اتصال بطيء"
    return "متصل"
  }

  const getDetailsText = () => {
    const details: string[] = []

    if (networkInfo.effectiveType) {
      details.push(`النوع: ${networkInfo.effectiveType}`)
    }

    if (networkInfo.downlink) {
      details.push(`السرعة: ${networkInfo.downlink.toFixed(1)} Mbps`)
    }

    if (networkInfo.rtt) {
      details.push(`الاستجابة: ${networkInfo.rtt}ms`)
    }

    if (networkInfo.saveData) {
      details.push("وضع توفير البيانات مفعّل")
    }

    return details.join(" • ")
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md text-sm",
              getStatusColor(),
              className
            )}
          >
            {getIcon()}
            {showDetails && (
              <span className="hidden sm:inline">{getStatusText()}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <div className="text-center">
            <p className="font-medium">{getStatusText()}</p>
            {networkInfo.status !== "offline" && (
              <p className="text-xs text-muted-foreground mt-1">
                {getDetailsText()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default NetworkStatusBar
