"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Account {
  id: string
  code: string
  name: string
  type: "asset" | "liability" | "equity" | "revenue" | "expense"
  balance: number
  isActive: boolean
  children?: Account[]
}

interface AccountTreeProps {
  accounts: Account[]
  onSelect?: (account: Account) => void
  onAdd?: (parentId?: string) => void
  onEdit?: (account: Account) => void
  onDelete?: (account: Account) => void
  selectedId?: string
  showActions?: boolean
}

const accountTypeColors = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  liability: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  equity: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  revenue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
}

const accountTypeLabels = {
  asset: "أصول",
  liability: "خصوم",
  equity: "حقوق ملكية",
  revenue: "إيرادات",
  expense: "مصروفات",
}

function AccountTreeItem({
  account,
  level = 0,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  selectedId,
  showActions = true,
}: {
  account: Account
  level?: number
  onSelect?: (account: Account) => void
  onAdd?: (parentId?: string) => void
  onEdit?: (account: Account) => void
  onDelete?: (account: Account) => void
  selectedId?: string
  showActions?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const hasChildren = account.children && account.children.length > 0
  const isSelected = selectedId === account.id

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount)
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors",
          "hover:bg-muted/50",
          isSelected && "bg-primary/10 border border-primary/20"
        )}
        style={{ paddingRight: `${level * 24 + 12}px` }}
        onClick={() => onSelect?.(account)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-6" />
        )}

        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}

        <span className="font-mono text-sm text-muted-foreground min-w-[80px]">
          {account.code}
        </span>

        <span className="flex-1 font-medium">{account.name}</span>

        <Badge
          variant="secondary"
          className={cn("text-xs", accountTypeColors[account.type])}
        >
          {accountTypeLabels[account.type]}
        </Badge>

        <span
          className={cn(
            "font-mono text-sm min-w-[120px] text-left",
            account.balance >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {formatCurrency(account.balance)}
        </span>

        {!account.isActive && (
          <Badge variant="outline" className="text-xs">
            معلق
          </Badge>
        )}

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAdd?.(account.id)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة حساب فرعي
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(account)}>
                <Edit className="h-4 w-4 ml-2" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete?.(account)}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {account.children!.map((child) => (
              <AccountTreeItem
                key={child.id}
                account={child}
                level={level + 1}
                onSelect={onSelect}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                selectedId={selectedId}
                showActions={showActions}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AccountTree({
  accounts,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  selectedId,
  showActions = true,
}: AccountTreeProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-mono min-w-[80px]">الكود</span>
          <span className="flex-1">اسم الحساب</span>
          <span className="min-w-[80px]">النوع</span>
          <span className="min-w-[120px] text-left">الرصيد</span>
        </div>
        {showActions && (
          <Button size="sm" onClick={() => onAdd?.()}>
            <Plus className="h-4 w-4 ml-2" />
            حساب جديد
          </Button>
        )}
      </div>

      <div className="border rounded-lg divide-y">
        {accounts.map((account) => (
          <div key={account.id} className="group">
            <AccountTreeItem
              account={account}
              onSelect={onSelect}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              selectedId={selectedId}
              showActions={showActions}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
