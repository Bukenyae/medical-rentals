import { createSupabaseClient } from './supabase'
import type { UserProfile, UserRole } from './types'
import { convertDbUserProfile } from './type-utils'

export interface AuthUser {
  id: string
  email: string
  profile?: UserProfile
}

export interface SignUpData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: UserRole
}

export interface SignInData {
  email: string
  password: string
}

export class AuthService {
  private supabase = createSupabaseClient()

  async signUp(data: SignUpData) {
    const { email, password, firstName, lastName, phone, role = 'guest' } = data

    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          role
        }
      }
    })

    if (authError) {
      throw new Error(authError.message)
    }

    return authData
  }

  async signIn(data: SignInData) {
    const { email, password } = data

    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      throw new Error(authError.message)
    }

    return authData
  }

  async signInWithProvider(provider: 'google' | 'github') {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    
    if (error) {
      throw new Error(error.message)
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error } = await this.supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user profile
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email!,
      profile: profile ? convertDbUserProfile(profile) : undefined
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data ? convertDbUserProfile(data) : null
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

export const authService = new AuthService()