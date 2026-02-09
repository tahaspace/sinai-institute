"use client"

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DataPoint {
  [key: string]: string | number
}

interface BarChartProps {
  data: DataPoint[]
  xAxisKey: string
  bars: {
    dataKey: string
    color?: string
    name?: string
    stackId?: string
  }[]
  title?: string
  description?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  layout?: "horizontal" | "vertical"
  stacked?: boolean
  className?: string
  colorByValue?: boolean
  colors?: string[]
}

const defaultColors = [
  "#2563EB", // Blue
  "#7C3AED", // Purple
  "#10B981", // Green
  "#F59E0B", // Orange
  "#EF4444", // Red
  "#06B6D4", // Cyan
]

export function BarChart({
  data,
  xAxisKey,
  bars,
  title,
  description,
  height = 350,
  showGrid = true,
  showLegend = true,
  layout = "horizontal",
  stacked = false,
  className,
  colorByValue = false,
  colors = defaultColors,
}: BarChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        {layout === "horizontal" ? (
          <>
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
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tick={{ fill: "currentColor", fontSize: 12 }}
              tickLine={{ stroke: "currentColor" }}
              axisLine={{ stroke: "currentColor" }}
            />
            <YAxis
              dataKey={xAxisKey}
              type="category"
              tick={{ fill: "currentColor", fontSize: 12 }}
              tickLine={{ stroke: "currentColor" }}
              axisLine={{ stroke: "currentColor" }}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        {showLegend && <Legend />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color || colors[index % colors.length]}
            name={bar.name || bar.dataKey}
            stackId={stacked ? "stack" : bar.stackId}
            radius={[4, 4, 0, 0]}
          >
            {colorByValue &&
              data.map((_, cellIndex) => (
                <Cell key={`cell-${cellIndex}`} fill={colors[cellIndex % colors.length]} />
              ))}
          </Bar>
        ))}
      </RechartsBarChart>
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

export default BarChart
