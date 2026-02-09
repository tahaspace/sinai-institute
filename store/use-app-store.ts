import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Language, Direction, User, Institution } from "@/types"

// ==========================================
// App State Store
// ==========================================

interface AppState {
  // Language
  language: Language
  direction: Direction
  setLanguage: (lang: Language) => void
  
  // Sidebar
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  
  // Mobile Menu
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  
  // Loading States
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Language - Default Arabic
      language: "ar",
      direction: "rtl",
      setLanguage: (lang) =>
        set({
          language: lang,
          direction: lang === "ar" ? "rtl" : "ltr",
        }),
      
      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      // Mobile Menu
      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      
      // Loading
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "edusaas-app-storage",
      partialize: (state) => ({
        language: state.language,
        direction: state.direction,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

// ==========================================
// Auth State Store
// ==========================================

interface AuthState {
  user: User | null
  institution: Institution | null
  isAuthenticated: boolean
  isLoading: boolean
  
  setUser: (user: User | null) => void
  setInstitution: (institution: Institution | null) => void
  login: (user: User, institution?: Institution) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      institution: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }),
      
      setInstitution: (institution) => set({ institution }),
      
      login: (user, institution) =>
        set({
          user,
          institution: institution || null,
          isAuthenticated: true,
          isLoading: false,
        }),
      
      logout: () =>
        set({
          user: null,
          institution: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: "edusaas-auth-storage",
      partialize: (state) => ({
        user: state.user,
        institution: state.institution,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// ==========================================
// UI State Store (non-persisted)
// ==========================================

interface UIState {
  // Modal States
  activeModal: string | null
  modalData: Record<string, unknown>
  openModal: (name: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  
  // Toast/Notification Queue
  notifications: Array<{
    id: string
    type: "success" | "error" | "warning" | "info"
    title: string
    message?: string
  }>
  addNotification: (notification: Omit<UIState["notifications"][0], "id">) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // Modals
  activeModal: null,
  modalData: {},
  openModal: (name, data = {}) =>
    set({ activeModal: name, modalData: data }),
  closeModal: () =>
    set({ activeModal: null, modalData: {} }),
  
  // Notifications
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: Date.now().toString() },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}))

