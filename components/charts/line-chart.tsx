"use client"

import {
  LineChart as RechartsLineChart,
  Line,
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

interface LineChartProps {
  data: DataPoint[]
  xAxisKey: string
  lines: {
    dataKey: string
    color?: string
    name?: string
    strokeWidth?: number
    type?: "monotone" | "linear" | "step"
  }[]
  title?: string
  description?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  className?: string
}

const defaultColors = [
  "#2563EB", // Blue
  "#7C3AED", // Purple
  "#10B981", // Green
  "#F59E0B", // Orange
  "#EF4444", // Red
  "#06B6D4", // Cyan
]

export function LineChart({
  data,
  xAxisKey,
  lines,
  title,
  description,
  height = 350,
  showGrid = true,
  showLegend = true,
  className,
}: LineChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type={line.type || "monotone"}
            dataKey={line.dataKey}
            stroke={line.color || defaultColors[index % defaultColors.length]}
            strokeWidth={line.strokeWidth || 2}
            name={line.name || line.dataKey}
            dot={{ fill: line.color || defaultColors[index % defaultColors.length] }}
            activeDot={{ r: 8 }}
          />
        ))}
      </RechartsLineChart>
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

export default LineChart
