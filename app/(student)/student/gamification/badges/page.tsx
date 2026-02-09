"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

// Mock badges data
const allBadges: BadgeData[] = [
  // Earned badges
  { id: "1", name: "بداية موفقة", description: "أكمل أول واجب", icon: "🎯", category: "academic", rarity: "common", earnedAt: "2024-12-01" },
  { id: "2", name: "طالب ملتزم", description: "حضور 30 يوم متواصل", icon: "📚", category: "attendance", rarity: "rare", earnedAt: "2024-12-15" },
  { id: "3", name: "قارئ نهم", description: "أكمل 20 درس", icon: "📖", category: "academic", rarity: "common", earnedAt: "2024-12-10" },
  { id: "4", name: "متعاون", description: "ساعد 10 زملاء", icon: "🤝", category: "social", rarity: "rare", earnedAt: "2024-12-08" },
  { id: "5", name: "نجم الأسبوع", description: "أفضل طالب هذا الأسبوع", icon: "⭐", category: "special", rarity: "epic", earnedAt: "2024-12-20" },
  { id: "6", name: "مثابر", description: "7 أيام حضور متواصل", icon: "🔥", category: "attendance", rarity: "common", earnedAt: "2024-12-05" },
  // Locked badges
  { id: "7", name: "متفوق", description: "احصل على درجة كاملة في 5 اختبارات", icon: "🏆", category: "academic", rarity: "epic", progress: 60, requirement: "3/5 اختبارات" },
  { id: "8", name: "أسطورة المدرسة", description: "كن الأول على مستوى المدرسة", icon: "👑", category: "special", rarity: "legendary", progress: 20, requirement: "الترتيب الحالي: #5" },
  { id: "9", name: "مبدع", description: "قدم 5 مشاريع إبداعية", icon: "💡", category: "activity", rarity: "rare", progress: 40, requirement: "2/5 مشاريع" },
  { id: "10", name: "قائد", description: "قُد فريق في 3 أنشطة", icon: "🎖️", category: "social", rarity: "epic", progress: 33, requirement: "1/3 أنشطة" },
  { id: "11", name: "محلل", description: "حل 100 مسألة رياضية", icon: "🧮", category: "academic", rarity: "rare", progress: 75, requirement: "75/100 مسألة" },
  { id: "12", name: "متحدث", description: "شارك في 5 مناقشات", icon: "💬", category: "social", rarity: "common", progress: 80, requirement: "4/5 مناقشات" },
]

export default function BadgesPage() {
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

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
    total: allBadges.length,
    earned: earnedBadges.length,
    percentage: Math.round((earnedBadges.length / allBadges.length) * 100),
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
