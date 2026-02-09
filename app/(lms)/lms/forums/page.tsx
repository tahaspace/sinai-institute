"use client"

import { useState } from "react"
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
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  CheckCircle2,
  User,
  Filter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Forums/Categories
const categories = [
  { id: 1, name: "الرياضيات", topics: 45, posts: 234, color: "bg-blue-500" },
  { id: 2, name: "الفيزياء", topics: 38, posts: 189, color: "bg-green-500" },
  { id: 3, name: "الكيمياء", topics: 29, posts: 145, color: "bg-purple-500" },
  { id: 4, name: "عام", topics: 56, posts: 312, color: "bg-orange-500" },
]

// Discussion Topics
const topics = [
  {
    id: 1,
    title: "استفسار عن حل معادلات الدرجة الثانية",
    category: "الرياضيات",
    author: "أحمد محمد",
    authorRole: "طالب",
    content: "مرحباً، هل يمكن لأحد شرح طريقة حل المعادلات التربيعية باستخدام القانون العام؟",
    date: "2024-12-25 10:30",
    replies: 8,
    views: 156,
    likes: 12,
    isPinned: true,
    isLocked: false,
    isAnswered: true,
    lastReply: "منذ 15 دقيقة",
  },
  {
    id: 2,
    title: "شرح قوانين نيوتن الثلاثة",
    category: "الفيزياء",
    author: "سارة خالد",
    authorRole: "طالب",
    content: "أريد فهم الفرق بين القوانين الثلاثة وتطبيقاتها العملية",
    date: "2024-12-25 09:15",
    replies: 5,
    views: 89,
    likes: 7,
    isPinned: false,
    isLocked: false,
    isAnswered: false,
    lastReply: "منذ ساعة",
  },
  {
    id: 3,
    title: "موازنة المعادلات الكيميائية",
    category: "الكيمياء",
    author: "محمد سعيد",
    authorRole: "طالب",
    content: "كيف يمكنني موازنة المعادلات الكيميائية المعقدة؟",
    date: "2024-12-24 16:45",
    replies: 12,
    views: 234,
    likes: 18,
    isPinned: false,
    isLocked: false,
    isAnswered: true,
    lastReply: "منذ 3 ساعات",
  },
  {
    id: 4,
    title: "إعلان: موعد الاختبار النهائي",
    category: "عام",
    author: "أ. أحمد علي",
    authorRole: "معلم",
    content: "يرجى العلم بأن الاختبار النهائي سيكون يوم الأحد القادم",
    date: "2024-12-24 14:00",
    replies: 3,
    views: 456,
    likes: 25,
    isPinned: true,
    isLocked: true,
    isAnswered: false,
    lastReply: "منذ يوم",
  },
]

// Replies for a topic
const replies = [
  {
    id: 1,
    author: "أ. محمد أحمد",
    authorRole: "معلم",
    content: "مرحباً أحمد، القانون العام لحل المعادلات التربيعية هو:\n\nx = (-b ± √(b² - 4ac)) / 2a\n\nحيث a هو معامل x²، و b هو معامل x، و c هو الحد الثابت.",
    date: "2024-12-25 10:45",
    likes: 15,
    isAccepted: true,
  },
  {
    id: 2,
    author: "فاطمة علي",
    authorRole: "طالب",
    content: "شكراً للشرح! هل يمكنك إعطاء مثال عملي؟",
    date: "2024-12-25 11:00",
    likes: 3,
    isAccepted: false,
  },
]

// Stats
const stats = {
  totalTopics: 168,
  totalPosts: 880,
  activeUsers: 245,
  todayPosts: 23,
}

export default function ForumsPage() {
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

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
            <p className="text-sm text-muted-foreground">مستخدم نشط</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.todayPosts}</p>
            <p className="text-sm text-muted-foreground">مشاركة اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", cat.color)}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-bold">{cat.name}</h3>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{cat.topics} موضوع</span>
                <span>{cat.posts} مشاركة</span>
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
                        <SelectItem key={cat.id} value={cat.id.toString()}>
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
            {topics.map((topic) => (
              <div
                key={topic.id}
                className={cn(
                  "p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer",
                  topic.isPinned && "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200"
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
                        {topic.isPinned && (
                          <Pin className="w-4 h-4 text-violet-500" />
                        )}
                        {topic.isLocked && (
                          <Lock className="w-4 h-4 text-red-500" />
                        )}
                        <h4 className="font-bold">{topic.title}</h4>
                        {topic.isAnswered && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 ml-1" />
                            تمت الإجابة
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {topic.content}
                      </p>
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
                          {topic.lastReply}
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
                    <div className="text-center">
                      <p className="font-bold text-foreground">{topic.likes}</p>
                      <p className="text-xs">إعجاب</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Topic Detail Modal/View */}
      {selectedTopic && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{topics.find(t => t.id === selectedTopic)?.title}</CardTitle>
                <CardDescription>
                  بواسطة {topics.find(t => t.id === selectedTopic)?.author} • {topics.find(t => t.id === selectedTopic)?.date}
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedTopic(null)}>إغلاق</Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Original Post */}
            <div className="p-4 rounded-lg bg-muted/50 mb-6">
              <p className="whitespace-pre-wrap">{topics.find(t => t.id === selectedTopic)?.content}</p>
              <div className="flex items-center gap-4 mt-4">
                <Button variant="ghost" size="sm">
                  <ThumbsUp className="w-4 h-4 ml-2" />
                  إعجاب ({topics.find(t => t.id === selectedTopic)?.likes})
                </Button>
                <Button variant="ghost" size="sm">
                  <Flag className="w-4 h-4 ml-2" />
                  إبلاغ
                </Button>
              </div>
            </div>

            {/* Replies */}
            <h4 className="font-bold mb-4">الردود ({replies.length})</h4>
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



