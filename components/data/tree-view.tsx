"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronDown, Folder, FolderOpen, File, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface TreeNode {
  id: string
  label: string
  icon?: React.ReactNode
  children?: TreeNode[]
  data?: Record<string, unknown>
  disabled?: boolean
}

interface TreeViewProps {
  data: TreeNode[]
  onSelect?: (node: TreeNode) => void
  onExpand?: (node: TreeNode, expanded: boolean) => void
  onContextMenu?: (node: TreeNode, action: string) => void
  selectedId?: string
  expandedIds?: string[]
  defaultExpandAll?: boolean
  showActions?: boolean
  actions?: { label: string; value: string; icon?: React.ReactNode }[]
  className?: string
}

interface TreeItemProps {
  node: TreeNode
  level: number
  selectedId?: string
  expandedIds: Set<string>
  onSelect?: (node: TreeNode) => void
  onToggle: (id: string) => void
  onContextMenu?: (node: TreeNode, action: string) => void
  showActions?: boolean
  actions?: { label: string; value: string; icon?: React.ReactNode }[]
}

function TreeItem({
  node,
  level,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  onContextMenu,
  showActions,
  actions,
}: TreeItemProps) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id

  const handleClick = () => {
    if (hasChildren) {
      onToggle(node.id)
    }
    onSelect?.(node)
  }

  const defaultIcon = hasChildren ? (
    isExpanded ? (
      <FolderOpen className="h-4 w-4 text-primary" />
    ) : (
      <Folder className="h-4 w-4 text-muted-foreground" />
    )
  ) : (
    <File className="h-4 w-4 text-muted-foreground" />
  )

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors group",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted",
          node.disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ paddingRight: `${level * 16 + 8}px` }}
        onClick={node.disabled ? undefined : handleClick}
      >
        {hasChildren ? (
          <motion.div
            initial={false}
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        ) : (
          <span className="w-4" />
        )}
        
        <span className="flex-shrink-0">{node.icon || defaultIcon}</span>
        
        <span className="flex-1 truncate text-sm">{node.label}</span>

        {showActions && actions && actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.value}
                  onClick={(e) => {
                    e.stopPropagation()
                    onContextMenu?.(node, action.value)
                  }}
                >
                  {action.icon}
                  <span className="mr-2">{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <TreeItem
                key={child.id}
                node={child}
                level={level + 1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggle={onToggle}
                onContextMenu={onContextMenu}
                showActions={showActions}
                actions={actions}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function getAllIds(nodes: TreeNode[]): string[] {
  const ids: string[] = []
  const traverse = (items: TreeNode[]) => {
    items.forEach((item) => {
      ids.push(item.id)
      if (item.children) {
        traverse(item.children)
      }
    })
  }
  traverse(nodes)
  return ids
}

export function TreeView({
  data,
  onSelect,
  onExpand,
  onContextMenu,
  selectedId,
  expandedIds: controlledExpandedIds,
  defaultExpandAll = false,
  showActions = false,
  actions = [],
  className,
}: TreeViewProps) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(() => {
    if (controlledExpandedIds) {
      return new Set(controlledExpandedIds)
    }
    return defaultExpandAll ? new Set(getAllIds(data)) : new Set()
  })

  const expandedIds = controlledExpandedIds
    ? new Set(controlledExpandedIds)
    : internalExpandedIds

  const handleToggle = useCallback(
    (id: string) => {
      const node = findNode(data, id)
      const newExpanded = !expandedIds.has(id)

      if (!controlledExpandedIds) {
        setInternalExpandedIds((prev) => {
          const next = new Set(prev)
          if (newExpanded) {
            next.add(id)
          } else {
            next.delete(id)
          }
          return next
        })
      }

      if (node) {
        onExpand?.(node, newExpanded)
      }
    },
    [data, expandedIds, controlledExpandedIds, onExpand]
  )

  return (
    <div className={cn("rounded-md border p-2", className)}>
      {data.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onToggle={handleToggle}
          onContextMenu={onContextMenu}
          showActions={showActions}
          actions={actions}
        />
      ))}
    </div>
  )
}

function findNode(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

export default TreeView
