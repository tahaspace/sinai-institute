"use client"

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DataPoint {
  name: string
  value: number
  color?: string
}

interface DonutChartProps {
  data: DataPoint[]
  title?: string
  description?: string
  height?: number
  showLegend?: boolean
  centerLabel?: string
  centerValue?: string | number
  innerRadius?: number
  outerRadius?: number
  className?: string
  colors?: string[]
}

const defaultColors = [
  "#2563EB", // Blue
  "#7C3AED", // Purple
  "#10B981", // Green
  "#F59E0B", // Orange
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#8B5CF6", // Violet
]

export function DonutChart({
  data,
  title,
  description,
  height = 350,
  showLegend = true,
  centerLabel,
  centerValue,
  innerRadius = 60,
  outerRadius = 90,
  className,
  colors = defaultColors,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          fill="#8884d8"
          dataKey="value"
          animationBegin={0}
          animationDuration={1000}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || colors[index % colors.length]}
              strokeWidth={0}
            />
          ))}
        </Pie>
        {(centerLabel || centerValue) && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
          >
            <tspan
              x="50%"
              dy="-0.5em"
              className="text-2xl font-bold fill-foreground"
            >
              {centerValue ?? total.toLocaleString("ar-EG")}
            </tspan>
            {centerLabel && (
              <tspan
                x="50%"
                dy="1.5em"
                className="text-sm fill-muted-foreground"
              >
                {centerLabel}
              </tspan>
            )}
          </text>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--popover-foreground))",
          }}
          formatter={(value: number, name: string) => [
            `${value.toLocaleString("ar-EG")} (${((value / total) * 100).toFixed(1)}%)`,
            name,
          ]}
        />
        {showLegend && (
          <Legend
            formatter={(value) => <span style={{ color: "currentColor" }}>{value}</span>}
          />
        )}
      </RechartsPieChart>
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

export default DonutChart
