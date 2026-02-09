"use client"

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DataPoint {
  [key: string]: string | number
}

interface AreaChartProps {
  data: DataPoint[]
  xAxisKey: string
  areas: {
    dataKey: string
    color?: string
    fillColor?: string
    name?: string
    type?: "monotone" | "linear" | "step"
    stackId?: string
  }[]
  title?: string
  description?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  stacked?: boolean
  gradient?: boolean
  className?: string
}

const defaultColors = [
  { stroke: "#2563EB", fill: "#2563EB" },
  { stroke: "#7C3AED", fill: "#7C3AED" },
  { stroke: "#10B981", fill: "#10B981" },
  { stroke: "#F59E0B", fill: "#F59E0B" },
  { stroke: "#EF4444", fill: "#EF4444" },
  { stroke: "#06B6D4", fill: "#06B6D4" },
]

export function AreaChart({
  data,
  xAxisKey,
  areas,
  title,
  description,
  height = 350,
  showGrid = true,
  showLegend = true,
  stacked = false,
  gradient = true,
  className,
}: AreaChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        {gradient && (
          <defs>
            {areas.map((area, index) => {
              const color = area.fillColor || area.color || defaultColors[index % defaultColors.length].fill
              return (
                <linearGradient key={`gradient-${index}`} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              )
            })}
          </defs>
        )}
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey={xAxisKey}
          tick={{ fill: "currentColor", fontSize: 12 }}
          tickLine={{ stroke: "currentColor" }}
          axisLine={{ stroke: "currentColor" }}
        />
        <YAxis
          tick={{ fill: "currentColor", fontSize: 12 }}
          tickLine={{ stroke: "currentColor" }}
          axisLine={{ stroke: "currentColor" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        {showLegend && <Legend />}
        {areas.map((area, index) => {
          const strokeColor = area.color || defaultColors[index % defaultColors.length].stroke
          const fillColor = gradient
            ? `url(#gradient-${area.dataKey})`
            : area.fillColor || area.color || defaultColors[index % defaultColors.length].fill
          return (
            <Area
              key={area.dataKey}
              type={area.type || "monotone"}
              dataKey={area.dataKey}
              stroke={strokeColor}
              fill={fillColor}
              fillOpacity={gradient ? 1 : 0.3}
              name={area.name || area.dataKey}
              stackId={stacked ? "stack" : area.stackId}
            />
          )
        })}
      </RechartsAreaChart>
    </ResponsiveContainer>
  )

  if (title) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{chartContent}</CardContent>
      </Card>
    )
  }

  return <div className={className}>{chartContent}</div>
}

export default AreaChart
