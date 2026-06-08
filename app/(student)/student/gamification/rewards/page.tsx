"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RewardsShop, type Reward } from "@/components/gamification"
import { Gift, History, Coins, Package, CheckCircle } from "lucide-react"

interface ApiReward {
  id: string
  name: string
  description: string
  icon: string
  cost: number
  stock: number
  canAfford: boolean
}

export default function RewardsPage() {
  const [userPoints, setUserPoints] = useState(0)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/student/gamification/rewards`)
        if (!res.ok) throw new Error("فشل في جلب المكافآت")
        const json: { points: number; rewards: ApiReward[] } = await res.json()
        if (!cancelled) {
          setUserPoints(json.points ?? 0)
          // category has no API backing → fixed neutral value so RewardsShop can render
          setRewards(
            (json.rewards ?? []).map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              icon: r.icon,
              cost: r.cost,
              stock: r.stock,
              category: "physical",
            }))
          )
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

  // No API backing for redeemed history → keep empty until an endpoint exists
  const redeemedRewards: (Reward & { redeemedAt: string })[] = []
  const totalRedeemed = redeemedRewards.reduce((sum, r) => sum + r.cost, 0)

  const handleRedeem = async (rewardId: string): Promise<boolean> => {
    const reward = rewards.find((r) => r.id === rewardId)
    if (!reward || userPoints < reward.cost) return false
    setUserPoints((prev) => prev - reward.cost)
    return true
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">متجر المكافآت</h1>
          <p className="text-muted-foreground">استبدل نقاطك بمكافآت رائعة</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <Coins className="w-5 h-5 text-yellow-600" />
          <span className="text-xl font-bold text-yellow-600">
            {userPoints.toLocaleString("ar-EG")}
          </span>
          <span className="text-sm text-yellow-600">نقطة</span>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل المكافآت...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{redeemedRewards.length}</p>
              <p className="text-xs text-muted-foreground">مكافآت مستبدلة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Coins className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRedeemed.toLocaleString("ar-EG")}</p>
              <p className="text-xs text-muted-foreground">نقاط مصروفة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rewards.length}</p>
              <p className="text-xs text-muted-foreground">مكافأة متاحة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shop">
            <Gift className="w-4 h-4 ml-2" />
            المتجر
          </TabsTrigger>
          <TabsTrigger value="redeemed">
            <History className="w-4 h-4 ml-2" />
            مكافآتي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop">
          <RewardsShop
            rewards={rewards}
            userPoints={userPoints}
            onRedeem={handleRedeem}
          />
        </TabsContent>

        <TabsContent value="redeemed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                المكافآت المستبدلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {redeemedRewards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لم تستبدل أي مكافآت بعد</p>
                  <Button variant="outline" className="mt-4">
                    تصفح المتجر
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {redeemedRewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{reward.icon}</span>
                        <div>
                          <p className="font-medium">{reward.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {reward.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <Badge variant="outline" className="text-green-600 mb-1">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          مستبدلة
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {reward.redeemedAt}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
