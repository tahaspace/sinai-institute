"use client"

import { useState, useEffect } from "react"
import {
  MessageSquare,
  Plus,
  Search,
  ThumbsUp,
  MessageCircle,
  Eye,
  Clock,
  Pin,
  Lock,
  Flag,
  CheckCircle2,
  User,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ForumCategory {
  id: string
  name: string
  description: string
  topics: number
}

interface ForumTopic {
  id: string
  category: string
  title: string
  author: string
  authorRole: string
  replies: number
  views: number
  pinned: boolean
  locked: boolean
  answered: boolean
  date: string
}

interface ForumStats {
  categories: number
  topics: number
  posts: number
  answered: number
}

// No API equivalent: the forums endpoint returns reply COUNTS only, not reply bodies.
// The detail panel below renders an empty state instead of inventing reply text.
type ForumReply = {
  id: string
  author: string
  authorRole: string
  content: string
  date: string
  likes: number
  isAccepted: boolean
}
const replies: ForumReply[] = []

export default function ForumsPage() {
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [apiStats, setApiStats] = useState<ForumStats>({ categories: 0, topics: 0, posts: 0, answered: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/lms/forums`)
        if (!res.ok) throw new Error("فشل في جلب المنتديات")
        const json = await res.json()
        if (!cancelled) {
          setCategories(json.categories ?? [])
          setTopics(json.topics ?? [])
          setApiStats(json.stats ?? { categories: 0, topics: 0, posts: 0, answered: 0 })
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

  const stats = {
    totalTopics: apiStats.topics,
    totalPosts: apiStats.posts,
    activeUsers: apiStats.categories,
    todayPosts: apiStats.answered,
  }

  const filteredTopics = topics.filter((topic) =>
    !searchQuery ||
    topic.title.includes(searchQuery) ||
    topic.author.includes(searchQuery) ||
    topic.category.includes(searchQuery)
  )

  const selected = topics.find((t) => t.id === selectedTopic)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">منتديات النقاش</h1>
          <p className="text-muted-foreground">تواصل مع زملائك ومعلميك</p>
        </div>
        <Button className="bg-violet-500 hover:bg-violet-600" onClick={() => setShowNewTopic(!showNewTopic)}>
          <Plus className="w-4 h-4 ml-2" />
          موضوع جديد
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل المنتديات...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-8 h-8 mx-auto text-violet-500 mb-2" />
            <p className="text-2xl font-bold">{stats.totalTopics}</p>
            <p className="text-sm text-muted-foreground">موضوع</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{stats.totalPosts}</p>
            <p className="text-sm text-muted-foreground">مشاركة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <User className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{stats.activeUsers}</p>
            <p className="text-sm text-muted-foreground">قسم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.todayPosts}</p>
            <p className="text-sm text-muted-foreground">تمت الإجابة</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white bg-violet-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-bold">{cat.name}</h3>
              </div>
              {cat.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cat.description}</p>
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{cat.topics} موضوع</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Topic Form */}
      {showNewTopic && (
        <Card>
          <CardHeader>
            <CardTitle>إنشاء موضوع جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>عنوان الموضوع</Label>
                  <Input placeholder="اكتب عنواناً واضحاً لموضوعك" />
                </div>
                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>المحتوى</Label>
                <Textarea placeholder="اكتب موضوعك هنا..." rows={6} />
              </div>
              <div className="flex items-center gap-2">
                <Button className="bg-violet-500 hover:bg-violet-600">نشر الموضوع</Button>
                <Button variant="outline" onClick={() => setShowNewTopic(false)}>إلغاء</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث في المنتديات..."
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select defaultValue="latest">
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">الأحدث</SelectItem>
            <SelectItem value="popular">الأكثر تفاعلاً</SelectItem>
            <SelectItem value="unanswered">بدون إجابة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Topics List */}
      <Card>
        <CardHeader>
          <CardTitle>المواضيع الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                className={cn(
                  "p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer",
                  topic.pinned && "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200"
                )}
                onClick={() => setSelectedTopic(topic.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={cn(
                        topic.authorRole === "معلم" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {topic.author.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {topic.pinned && (
                          <Pin className="w-4 h-4 text-violet-500" />
                        )}
                        {topic.locked && (
                          <Lock className="w-4 h-4 text-red-500" />
                        )}
                        <h4 className="font-bold">{topic.title}</h4>
                        {topic.answered && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 ml-1" />
                            تمت الإجابة
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {topic.author}
                          {topic.authorRole === "معلم" && (
                            <Badge variant="outline" className="text-xs py-0">معلم</Badge>
                          )}
                        </span>
                        <Badge variant="outline">{topic.category}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {topic.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="text-center">
                      <p className="font-bold text-foreground">{topic.replies}</p>
                      <p className="text-xs">رد</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-foreground">{topic.views}</p>
                      <p className="text-xs">مشاهدة</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !error && filteredTopics.length === 0 && (
              <p className="text-center text-muted-foreground py-8">لا توجد مواضيع</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topic Detail Modal/View */}
      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selected.title}</CardTitle>
                <CardDescription>
                  بواسطة {selected.author} • {selected.date}
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedTopic(null)}>إغلاق</Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Topic meta */}
            <div className="p-4 rounded-lg bg-muted/50 mb-6">
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <Badge variant="outline">{selected.category}</Badge>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {selected.replies} رد
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {selected.views} مشاهدة
                </span>
                {selected.answered && (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 ml-1" />
                    تمت الإجابة
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-4">
                <Button variant="ghost" size="sm">
                  <ThumbsUp className="w-4 h-4 ml-2" />
                  إعجاب
                </Button>
                <Button variant="ghost" size="sm">
                  <Flag className="w-4 h-4 ml-2" />
                  إبلاغ
                </Button>
              </div>
            </div>

            {/* Replies — API returns reply COUNTS only, not bodies. Show count + empty state. */}
            <h4 className="font-bold mb-4">الردود ({selected.replies})</h4>
            {replies.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا تتوفر تفاصيل الردود</p>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      reply.isAccepted && "bg-green-50 border-green-200 dark:bg-green-950/20"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback className={cn(
                          reply.authorRole === "معلم" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {reply.author.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold">{reply.author}</span>
                          {reply.authorRole === "معلم" && (
                            <Badge className="bg-green-100 text-green-700">معلم</Badge>
                          )}
                          {reply.isAccepted && (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                              الإجابة المقبولة
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{reply.date}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{reply.content}</p>
                        <div className="flex items-center gap-2 mt-4">
                          <Button variant="ghost" size="sm">
                            <ThumbsUp className="w-4 h-4 ml-2" />
                            {reply.likes}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="w-4 h-4 ml-2" />
                            رد
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            <div className="mt-6 p-4 border rounded-lg">
              <Label className="mb-2 block">إضافة رد</Label>
              <Textarea placeholder="اكتب ردك هنا..." rows={4} className="mb-4" />
              <Button className="bg-violet-500 hover:bg-violet-600">
                <MessageCircle className="w-4 h-4 ml-2" />
                إرسال الرد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}



