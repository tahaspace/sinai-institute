"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LeaderboardTable, type LeaderboardEntry } from "@/components/gamification"
import { Trophy, Users, Calendar, School, Crown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface ApiLeaderboardRow {
  rank: number
  name: string
  studentCode: string
  points: number
  isCurrent: boolean
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentRank, setCurrentRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/student/gamification/leaderboard`)
        if (!res.ok) throw new Error("فشل في جلب لوحة المتصدرين")
        const json = await res.json()
        if (!cancelled) {
          const rows: ApiLeaderboardRow[] = json.leaderboard ?? []
          setLeaderboard(
            rows.map((r) => ({
              rank: r.rank,
              userId: r.studentCode,
              name: r.name,
              points: r.points,
              // No API backing for level/badges — neutralize.
              level: 0,
              badges: 0,
              isCurrentUser: r.isCurrent,
            }))
          )
          setCurrentRank(json.currentRank ?? null)
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

  const topStudents = leaderboard.slice(0, 3)
  const currentEntry = leaderboard.find((e) => e.isCurrentUser)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">لوحة المتصدرين</h1>
        <p className="text-muted-foreground">تنافس مع زملائك واحصل على أعلى الترتيب</p>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل لوحة المتصدرين...</CardContent></Card>}

      {/* Top 3 Podium */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            أفضل 3 طلاب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-center gap-4 pt-8">
            {/* Second place */}
            <div className="text-center">
              <div className="relative mb-2">
                <Avatar className="w-16 h-16 mx-auto border-4 border-gray-400">
                  <AvatarFallback>{topStudents[1]?.name.charAt(0) ?? "—"}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                  2
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-t-lg p-4 h-24 flex flex-col justify-end">
                <p className="font-bold text-sm truncate">{topStudents[1]?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{(topStudents[1]?.points ?? 0).toLocaleString("ar-EG")} نقطة</p>
              </div>
            </div>

            {/* First place */}
            <div className="text-center -mb-4">
              <div className="relative mb-2">
                <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-1" />
                <Avatar className="w-20 h-20 mx-auto border-4 border-yellow-500">
                  <AvatarFallback>{topStudents[0]?.name.charAt(0) ?? "—"}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
                  1
                </div>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-t-lg p-4 h-32 flex flex-col justify-end">
                <p className="font-bold truncate">{topStudents[0]?.name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{(topStudents[0]?.points ?? 0).toLocaleString("ar-EG")} نقطة</p>
                <Badge className="mt-1 bg-yellow-500">بطل المدرسة</Badge>
              </div>
            </div>

            {/* Third place */}
            <div className="text-center">
              <div className="relative mb-2">
                <Avatar className="w-16 h-16 mx-auto border-4 border-amber-600">
                  <AvatarFallback>{topStudents[2]?.name.charAt(0) ?? "—"}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                  3
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-t-lg p-4 h-20 flex flex-col justify-end">
                <p className="font-bold text-sm truncate">{topStudents[2]?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{(topStudents[2]?.points ?? 0).toLocaleString("ar-EG")} نقطة</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Rank Card */}
      <Card className="bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">#{currentRank ?? "—"}</span>
              </div>
              <div>
                <p className="font-bold">ترتيبك في المدرسة</p>
                <p className="text-sm text-muted-foreground">{(currentEntry?.points ?? 0).toLocaleString("ar-EG")} نقطة</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="school" className="space-y-6">
        <TabsList>
          <TabsTrigger value="school">
            <School className="w-4 h-4 ml-2" />
            المدرسة
          </TabsTrigger>
          <TabsTrigger value="class">
            <Users className="w-4 h-4 ml-2" />
            الفصل
          </TabsTrigger>
          <TabsTrigger value="weekly">
            <Calendar className="w-4 h-4 ml-2" />
            هذا الأسبوع
          </TabsTrigger>
        </TabsList>

        <TabsContent value="school">
          <LeaderboardTable
            entries={leaderboard}
            title="ترتيب طلاب المدرسة"
          />
        </TabsContent>

        <TabsContent value="class">
          <LeaderboardTable
            entries={leaderboard}
            title="ترتيب طلاب الفصل"
          />
        </TabsContent>

        <TabsContent value="weekly">
          <LeaderboardTable
            entries={leaderboard}
            title="متصدري هذا الأسبوع"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
