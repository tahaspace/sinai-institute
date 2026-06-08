"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { BadgeCard, type BadgeData } from "@/components/gamification"
import { Medal, Lock, CheckCircle, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ApiBadge {
  id: string
  name: string
  description: string
  icon: string
  category: string
  threshold: number
  earned: boolean
  earnedAt: string | null
}

export default function BadgesPage() {
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [allBadges, setAllBadges] = useState<BadgeData[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; earned: number }>({ total: 0, earned: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/student/gamification/badges`)
        if (!res.ok) throw new Error("فشل في جلب الشارات")
        const json = await res.json()
        if (!cancelled) {
          const mapped: BadgeData[] = ((json.badges ?? []) as ApiBadge[]).map((b) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            icon: b.icon,
            category: b.category as BadgeData["category"],
            // API has no rarity; default to neutral "common" (drives only label/color, not earned state)
            rarity: "common",
            // BadgeCard derives earned/locked from earnedAt; honor the API "earned" flag
            earnedAt: b.earned ? b.earnedAt ?? undefined : undefined,
          }))
          setAllBadges(mapped)
          setApiStats(json.stats ?? { total: 0, earned: 0 })
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const earnedBadges = allBadges.filter((b) => b.earnedAt)
  const lockedBadges = allBadges.filter((b) => !b.earnedAt)

  const filteredBadges = allBadges.filter((badge) => {
    const statusMatch = filter === "all" || 
      (filter === "earned" && badge.earnedAt) || 
      (filter === "locked" && !badge.earnedAt)
    const categoryMatch = categoryFilter === "all" || badge.category === categoryFilter
    return statusMatch && categoryMatch
  })

  const stats = {
    total: apiStats.total,
    earned: apiStats.earned,
    percentage: apiStats.total > 0 ? Math.round((apiStats.earned / apiStats.total) * 100) : 0,
    // API carries no rarity; these breakdowns are neutralized to 0 (no invented data)
    byRarity: {
      common: allBadges.filter((b) => b.rarity === "common" && b.earnedAt).length,
      rare: allBadges.filter((b) => b.rarity === "rare" && b.earnedAt).length,
      epic: allBadges.filter((b) => b.rarity === "epic" && b.earnedAt).length,
      legendary: allBadges.filter((b) => b.rarity === "legendary" && b.earnedAt).length,
    },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">شاراتي</h1>
          <p className="text-muted-foreground">اجمع الشارات وأكمل الإنجازات</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 ml-2" />
              تصفية
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
              الكل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategoryFilter("academic")}>
              أكاديمي
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategoryFilter("attendance")}>
              الحضور
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategoryFilter("activity")}>
              الأنشطة
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategoryFilter("social")}>
              اجتماعي
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategoryFilter("special")}>
              خاص
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الشارات...</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Medal className="w-6 h-6 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stats.earned}/{stats.total}</p>
            <p className="text-xs text-muted-foreground">الشارات المكتسبة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
              <span className="text-xl">🥈</span>
            </div>
            <p className="text-2xl font-bold">{stats.byRarity.rare}</p>
            <p className="text-xs text-muted-foreground">شارة نادرة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2">
              <span className="text-xl">💎</span>
            </div>
            <p className="text-2xl font-bold">{stats.byRarity.epic}</p>
            <p className="text-xs text-muted-foreground">شارة ملحمية</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-2">
              <span className="text-xl">👑</span>
            </div>
            <p className="text-2xl font-bold">{stats.byRarity.legendary}</p>
            <p className="text-xs text-muted-foreground">شارة أسطورية</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">تقدم الإنجازات</span>
            <span className="text-sm text-muted-foreground">{stats.percentage}%</span>
          </div>
          <Progress value={stats.percentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">
            الكل ({allBadges.length})
          </TabsTrigger>
          <TabsTrigger value="earned">
            <CheckCircle className="w-4 h-4 ml-1" />
            مكتسبة ({earnedBadges.length})
          </TabsTrigger>
          <TabsTrigger value="locked">
            <Lock className="w-4 h-4 ml-1" />
            مقفلة ({lockedBadges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <BadgeCard badge={badge} />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="earned" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <BadgeCard badge={badge} />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="locked" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <BadgeCard badge={badge} />
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
