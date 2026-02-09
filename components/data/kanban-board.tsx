"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, MoreHorizontal, GripVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface KanbanTask {
  id: string
  title: string
  description?: string
  priority?: "low" | "medium" | "high" | "urgent"
  assignee?: {
    name: string
    avatar?: string
  }
  tags?: string[]
  dueDate?: string
}

export interface KanbanColumn {
  id: string
  title: string
  color?: string
  tasks: KanbanTask[]
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void
  onTaskClick?: (task: KanbanTask) => void
  onTaskAdd?: (columnId: string) => void
  onTaskDelete?: (taskId: string, columnId: string) => void
  onColumnAdd?: () => void
  showAddColumn?: boolean
  showAddTask?: boolean
  className?: string
}

const priorityColors = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
}

const priorityLabels = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
}

function KanbanTaskCard({
  task,
  columnId,
  onTaskClick,
  onTaskDelete,
}: {
  task: KanbanTask
  columnId: string
  onTaskClick?: (task: KanbanTask) => void
  onTaskDelete?: (taskId: string, columnId: string) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
      onClick={() => onTaskClick?.(task)}
    >
      <Card className="bg-card hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTaskClick?.(task)}>
                  عرض التفاصيل
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTaskDelete?.(task.id, columnId)
                  }}
                >
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            {task.priority && (
              <Badge className={cn("text-xs", priorityColors[task.priority])}>
                {priorityLabels[task.priority]}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              {task.dueDate && (
                <span className="text-xs text-muted-foreground">{task.dueDate}</span>
              )}
              {task.assignee && (
                <Avatar className="h-6 w-6">
                  <AvatarImage src={task.assignee.avatar} />
                  <AvatarFallback className="text-xs">
                    {task.assignee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function KanbanBoard({
  columns,
  onTaskMove,
  onTaskClick,
  onTaskAdd,
  onTaskDelete,
  onColumnAdd,
  showAddColumn = true,
  showAddTask = true,
  className,
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<{ taskId: string; columnId: string } | null>(null)

  const handleDragStart = (taskId: string, columnId: string) => {
    setDraggedTask({ taskId, columnId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetColumnId: string) => {
    if (draggedTask && draggedTask.columnId !== targetColumnId) {
      onTaskMove?.(draggedTask.taskId, draggedTask.columnId, targetColumnId)
    }
    setDraggedTask(null)
  }

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 w-72"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(column.id)}
        >
          <Card className="h-full">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {column.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                  )}
                  <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {column.tasks.length}
                  </Badge>
                </div>
                {showAddTask && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onTaskAdd?.(column.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              <AnimatePresence>
                {column.tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id, column.id)}
                  >
                    <KanbanTaskCard
                      task={task}
                      columnId={column.id}
                      onTaskClick={onTaskClick}
                      onTaskDelete={onTaskDelete}
                    />
                  </div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      ))}

      {showAddColumn && (
        <div className="flex-shrink-0 w-72">
          <Button
            variant="outline"
            className="w-full h-12 border-dashed"
            onClick={onColumnAdd}
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة عمود
          </Button>
        </div>
      )}
    </div>
  )
}

export default KanbanBoard
