"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  GripVertical,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export interface ListItem {
  id: string
  title: string
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  image?: string
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  data?: Record<string, unknown>
  children?: ListItem[]
  disabled?: boolean
}

interface AdvancedListProps {
  items: ListItem[]
  onItemClick?: (item: ListItem) => void
  onItemSelect?: (selectedItems: ListItem[]) => void
  onReorder?: (items: ListItem[]) => void
  onAction?: (item: ListItem, action: string) => void
  searchable?: boolean
  searchPlaceholder?: string
  selectable?: boolean
  reorderable?: boolean
  collapsible?: boolean
  actions?: { label: string; value: string; icon?: React.ReactNode }[]
  emptyMessage?: string
  className?: string
}

function ListItemComponent({
  item,
  selectable,
  reorderable,
  collapsible,
  actions,
  isSelected,
  onSelect,
  onClick,
  onAction,
}: {
  item: ListItem
  selectable?: boolean
  reorderable?: boolean
  collapsible?: boolean
  actions?: { label: string; value: string; icon?: React.ReactNode }[]
  isSelected: boolean
  onSelect: (id: string) => void
  onClick?: (item: ListItem) => void
  onAction?: (item: ListItem, action: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        isSelected ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted/50",
        item.disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {reorderable && (
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab flex-shrink-0" />
      )}

      {selectable && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(item.id)}
          disabled={item.disabled}
          className="flex-shrink-0"
        />
      )}

      {item.image && (
        <img
          src={item.image}
          alt={item.title}
          className="w-10 h-10 rounded-md object-cover flex-shrink-0"
        />
      )}

      {item.icon && <div className="flex-shrink-0">{item.icon}</div>}

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => !item.disabled && onClick?.(item)}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{item.title}</h4>
          {item.badge && (
            <Badge variant={item.badgeVariant || "secondary"} className="text-xs">
              {item.badge}
            </Badge>
          )}
        </div>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
        )}
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {collapsible && hasChildren && (
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      )}

      {actions && actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.value}
                onClick={() => onAction?.(item, action.value)}
              >
                {action.icon}
                <span className="mr-2">{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )

  if (collapsible && hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {content}
        <CollapsibleContent>
          <div className="mr-8 mt-2 space-y-2">
            {item.children!.map((child) => (
              <ListItemComponent
                key={child.id}
                item={child}
                selectable={selectable}
                reorderable={false}
                collapsible={collapsible}
                actions={actions}
                isSelected={false}
                onSelect={onSelect}
                onClick={onClick}
                onAction={onAction}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return content
}

export function AdvancedList({
  items,
  onItemClick,
  onItemSelect,
  onReorder,
  onAction,
  searchable = true,
  searchPlaceholder = "بحث...",
  selectable = false,
  reorderable = false,
  collapsible = false,
  actions,
  emptyMessage = "لا توجد عناصر",
  className,
}: AdvancedListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [listItems, setListItems] = useState(items)

  const filteredItems = useMemo(() => {
    if (!searchQuery) return listItems
    const query = searchQuery.toLowerCase()
    return listItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    )
  }, [listItems, searchQuery])

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)

    if (onItemSelect) {
      const selectedItems = listItems.filter((item) => newSelected.has(item.id))
      onItemSelect(selectedItems)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === listItems.length) {
      setSelectedIds(new Set())
      onItemSelect?.([])
    } else {
      const allIds = new Set(listItems.map((item) => item.id))
      setSelectedIds(allIds)
      onItemSelect?.(listItems)
    }
  }

  const handleReorder = (newOrder: ListItem[]) => {
    setListItems(newOrder)
    onReorder?.(newOrder)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      {(searchable || selectable) && (
        <div className="flex items-center gap-4">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
          )}
          {selectable && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === listItems.length && listItems.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} محدد`
                  : "تحديد الكل"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
      ) : reorderable ? (
        <Reorder.Group
          axis="y"
          values={filteredItems}
          onReorder={handleReorder}
          className="space-y-2"
        >
          <AnimatePresence>
            {filteredItems.map((item) => (
              <Reorder.Item key={item.id} value={item}>
                <ListItemComponent
                  item={item}
                  selectable={selectable}
                  reorderable={reorderable}
                  collapsible={collapsible}
                  actions={actions}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={handleSelect}
                  onClick={onItemClick}
                  onAction={onAction}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ListItemComponent
                  item={item}
                  selectable={selectable}
                  reorderable={reorderable}
                  collapsible={collapsible}
                  actions={actions}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={handleSelect}
                  onClick={onItemClick}
                  onAction={onAction}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default AdvancedList
