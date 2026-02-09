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

interface PieChartProps {
  data: DataPoint[]
  title?: string
  description?: string
  height?: number
  showLegend?: boolean
  showLabels?: boolean
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

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function PieChart({
  data,
  title,
  description,
  height = 350,
  showLegend = true,
  showLabels = true,
  innerRadius = 0,
  outerRadius = 80,
  className,
  colors = defaultColors,
}: PieChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderCustomizedLabel : undefined}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          fill="#8884d8"
          dataKey="value"
          animationBegin={0}
          animationDuration={1000}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--popover-foreground))",
          }}
          formatter={(value: number) => [value.toLocaleString("ar-EG"), "القيمة"]}
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

export default PieChart
