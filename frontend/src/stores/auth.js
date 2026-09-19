import { defineStore } from 'pinia'
import api from '../services/api'

/**
 * Auth store - manages the logged-in user and JWT token.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    profile: JSON.parse(localStorage.getItem('profile') || 'null'),
    staff: JSON.parse(localStorage.getItem('staff') || 'null'),
    impersonating: localStorage.getItem('impersonating') === '1',
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    role: (state) => state.user?.role_slug || '',
    isAdmin: (state) => state.user?.role_slug === 'super_admin',
    isVendor: (state) => state.user?.role_slug === 'vendor',
    isStaff: (state) => state.user?.role_slug === 'vendor_staff',
    isCustomer: (state) => state.user?.role_slug === 'customer',
    isImpersonating: (state) => state.impersonating,
    vendorApproved: (state) =>
      state.profile?.approval_status === 'approved',
    staffRole: (state) => state.staff?.role || '',
    staffPermissions: (state) =>
      Array.isArray(state.staff?.permissions) ? state.staff.permissions : [],
    // Whether the current user may access an area requiring any of the given
    // permission codes. Owners and manager/operator staff have full access;
    // everything else needs the permission in their staff record.
    canAccess: (state) => (permissions) => {
      if (!Array.isArray(permissions) || permissions.length === 0) return true
      const role = state.staff?.role || ''
      if (role === 'manager' || role === 'operator') return true
      const granted = Array.isArray(state.staff?.permissions) ? state.staff.permissions : []
      return permissions.some((p) => granted.includes(p))
    },
  },

  actions: {
    setSession(data) {
      this.token = data.token
      this.user = data.user
      this.profile = data.profile || null
      this.staff = data.staff || null
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.profile) {
        localStorage.setItem('profile', JSON.stringify(data.profile))
      }
      if (data.staff) {
        localStorage.setItem('staff', JSON.stringify(data.staff))
      }
    },

    async login(email, password) {
      const { data } = await api.post('/login', { email, password })
      if (!data.success) throw new Error(data.message)
      if (data.data.requires_verification) {
        return { requires_verification: true, email: data.data.email }
      }
      if (data.data.requires_2fa) {
        return { requires_2fa: true, tfa_token: data.data.tfa_token }
      }
      this.setSession(data.data)
      return data.data
    },

    async verifyEmail(email, code) {
      const { data } = await api.post('/email/verify', { email, code })
      if (!data.success) throw new Error(data.message)
      return data.data
    },

    async resendVerification(email) {
      const { data } = await api.post('/email/resend', { email })
      if (!data.success) throw new Error(data.message)
      return data.data
    },

    async verifyTwoFactor(tfaToken, code) {
      const { data } = await api.post('/login/2fa', { tfa_token: tfaToken, code })
      if (!data.success) throw new Error(data.message)
      this.setSession(data.data)
      return data.data
    },

    async forgotPassword(email) {
      const { data } = await api.post('/password/forgot', { email })
      if (!data.success) throw new Error(data.message)
      return data.data
    },

    async resetPassword(email, token, password) {
      const { data } = await api.post('/password/reset', { email, token, password })
      if (!data.success) throw new Error(data.message)
      return data.data
    },

    async registerCustomer(payload) {
      const { data } = await api.post('/register/customer', payload)
      if (!data.success) throw new Error(data.message)
      return data.data
    },

    async registerVendor(payload) {
      const { data } = await api.post('/register/vendor', payload)
      if (!data.success) throw new Error(data.message)
      this.setSession({
        token: data.data.token,
        user: data.data.user,
        profile: data.data.vendor || data.data.profile || null,
      })
      return data.data
    },

    async logout() {
      try {
        await api.post('/logout')
      } catch (e) {
        // ignore
      }
      this.token = null
      this.user = null
      this.profile = null
      this.staff = null
      this.impersonating = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('profile')
      localStorage.removeItem('staff')
      localStorage.removeItem('impersonating')
      sessionStorage.removeItem('admin_session')
    },

    async impersonateVendor(vendorId) {
      if (!this.impersonating) {
        sessionStorage.setItem('admin_session', JSON.stringify({
          token: this.token,
          user: this.user,
          profile: this.profile,
        }))
      }
      const { data } = await api.post(`/admin/vendors/${vendorId}/impersonate`)
      if (!data.success) throw new Error(data.message)
      this.setSession(data.data)
      this.impersonating = true
      localStorage.setItem('impersonating', '1')
      return data.data
    },

    exitImpersonation() {
      let adminSession = null
      try {
        adminSession = JSON.parse(sessionStorage.getItem('admin_session') || 'null')
      } catch (e) {
        adminSession = null
      }
      if (adminSession && adminSession.token) {
        this.setSession(adminSession)
      }
      this.impersonating = false
      localStorage.removeItem('impersonating')
      sessionStorage.removeItem('admin_session')
      return adminSession
    },

    async fetchProfile() {
      const { data } = await api.get('/profile')
      this.user = data.data.user
      this.profile = data.data.profile
      this.staff = data.data.staff || null
      localStorage.setItem('user', JSON.stringify(this.user))
      if (this.profile) {
        localStorage.setItem('profile', JSON.stringify(this.profile))
      }
      if (this.staff) {
        localStorage.setItem('staff', JSON.stringify(this.staff))
      }
      return data.data
    },
  },
})
