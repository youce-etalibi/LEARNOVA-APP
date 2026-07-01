import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      roles: [],
      permissions: [],

      setToken: (token) => set({ token }),

      setSession: ({ access_token, user, roles, permissions }) =>
        set({
          token: access_token ?? get().token,
          user: user ?? get().user,
          roles: roles ?? get().roles,
          permissions: permissions ?? get().permissions,
        }),

      logout: () => set({ token: null, user: null, roles: [], permissions: [] }),

      hasRole: (role) => get().roles?.includes(role),
      hasAnyRole: (list) => list.some((r) => get().roles?.includes(r)),
      can: (permission) => get().permissions?.includes(permission),
    }),
    { name: 'learnova-auth' },
  ),
)
