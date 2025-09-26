import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsPage from '@/app/settings/page'

// Mock the Supabase auth hook
const mockSupabaseAuth = {
  user: null,
  userProfile: null,
  isLoading: false,
  isAuthenticated: false,
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}

jest.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => mockSupabaseAuth,
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock state
    mockSupabaseAuth.user = null
    mockSupabaseAuth.userProfile = null
    mockSupabaseAuth.isLoading = false
    mockSupabaseAuth.isAuthenticated = false
  })

  describe('Page Structure', () => {
    it('renders the settings page with correct title', () => {
      render(<SettingsPage />)
      expect(screen.getByText('設定')).toBeInTheDocument()
      expect(screen.getByText('← 返回首頁')).toBeInTheDocument()
    })

    it('renders system information section', () => {
      render(<SettingsPage />)
      expect(screen.getByText('ℹ️ 系統資訊')).toBeInTheDocument()
      expect(screen.getByText('• 資料儲存：所有設定保存在 Supabase 資料庫')).toBeInTheDocument()
      expect(screen.getByText('• 版本：v4.0.0 - Supabase 架構')).toBeInTheDocument()
    })
  })

  describe('Authentication States', () => {
    it('shows loading state when isLoading is true', () => {
      mockSupabaseAuth.isLoading = true
      render(<SettingsPage />)
      expect(screen.getByText('載入中...')).toBeInTheDocument()
    })

    it('shows login prompt when user is not authenticated', () => {
      mockSupabaseAuth.isLoading = false
      mockSupabaseAuth.isAuthenticated = false
      render(<SettingsPage />)

      expect(screen.getByText('🔒')).toBeInTheDocument()
      expect(screen.getByText('請先登入')).toBeInTheDocument()
      expect(screen.getByText('使用 Google 帳戶登入以管理您的設定')).toBeInTheDocument()
      expect(screen.getByText('🔐 使用 Google 登入')).toBeInTheDocument()
    })

    it('calls signInWithGoogle when login button is clicked', async () => {
      mockSupabaseAuth.isLoading = false
      mockSupabaseAuth.isAuthenticated = false
      render(<SettingsPage />)

      const loginButton = screen.getByText('🔐 使用 Google 登入')
      fireEvent.click(loginButton)

      expect(mockSupabaseAuth.signInWithGoogle).toHaveBeenCalledTimes(1)
    })

    it('shows authenticated user info when logged in', () => {
      mockSupabaseAuth.isLoading = false
      mockSupabaseAuth.isAuthenticated = true
      mockSupabaseAuth.user = {
        id: 'test-user-id',
        email: 'test@example.com'
      }
      mockSupabaseAuth.userProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        is_admin: false
      }

      render(<SettingsPage />)

      expect(screen.getByText('已登入')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('🚪 登出')).toBeInTheDocument()
    })

    it('shows admin badge for admin users', () => {
      mockSupabaseAuth.isLoading = false
      mockSupabaseAuth.isAuthenticated = true
      mockSupabaseAuth.user = {
        id: 'admin-user-id',
        email: 'admin@example.com'
      }
      mockSupabaseAuth.userProfile = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        name: 'Admin User',
        is_admin: true
      }

      render(<SettingsPage />)

      expect(screen.getByText('🛡️ 管理員權限')).toBeInTheDocument()
    })

    it('calls signOut when logout button is clicked', async () => {
      mockSupabaseAuth.isLoading = false
      mockSupabaseAuth.isAuthenticated = true
      mockSupabaseAuth.user = {
        id: 'test-user-id',
        email: 'test@example.com'
      }

      render(<SettingsPage />)

      const logoutButton = screen.getByText('🚪 登出')
      fireEvent.click(logoutButton)

      expect(mockSupabaseAuth.signOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('Medical Settings Section', () => {
    beforeEach(() => {
      // Set up authenticated state
      mockSupabaseAuth.isLoading = false
      mockSupabaseAuth.isAuthenticated = true
      mockSupabaseAuth.user = {
        id: 'test-user-id',
        email: 'test@example.com'
      }
      mockSupabaseAuth.userProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        medical_conditions: [],
        allergies: [],
        dietary_restrictions: [],
        medications: []
      }
    })

    it('shows medical settings section when authenticated', () => {
      render(<SettingsPage />)

      expect(screen.getByText('🏥 醫療狀況設定')).toBeInTheDocument()
      expect(screen.getByText('目前醫療狀況')).toBeInTheDocument()
      expect(screen.getByText('已知過敏原')).toBeInTheDocument()
      expect(screen.getByText('飲食限制偏好')).toBeInTheDocument()
    })

    it('does not show medical settings when not authenticated', () => {
      mockSupabaseAuth.isAuthenticated = false
      render(<SettingsPage />)

      expect(screen.queryByText('🏥 醫療狀況設定')).not.toBeInTheDocument()
    })

    it('displays common medical conditions', () => {
      render(<SettingsPage />)

      expect(screen.getByText('發炎性腸病 (IBD)')).toBeInTheDocument()
      expect(screen.getByText('克隆氏症')).toBeInTheDocument()
      expect(screen.getByText('潰瘍性結腸炎')).toBeInTheDocument()
      expect(screen.getByText('腸躁症 (IBS)')).toBeInTheDocument()
      expect(screen.getByText('糖尿病')).toBeInTheDocument()
    })

    it('displays common allergens', () => {
      render(<SettingsPage />)

      expect(screen.getByText('牛奶')).toBeInTheDocument()
      expect(screen.getByText('雞蛋')).toBeInTheDocument()
      expect(screen.getByText('花生')).toBeInTheDocument()
      expect(screen.getByText('堅果')).toBeInTheDocument()
      expect(screen.getByText('大豆')).toBeInTheDocument()
    })

    it('displays dietary restrictions', () => {
      render(<SettingsPage />)

      expect(screen.getByText('素食')).toBeInTheDocument()
      expect(screen.getByText('純素食')).toBeInTheDocument()
      expect(screen.getByText('低鈉飲食')).toBeInTheDocument()
      expect(screen.getByText('無麩質飲食')).toBeInTheDocument()
      expect(screen.getByText('低 FODMAP 飲食')).toBeInTheDocument()
    })

    it('toggles medical condition selection', async () => {
      render(<SettingsPage />)

      const ibdButton = screen.getByText('發炎性腸病 (IBD)')
      fireEvent.click(ibdButton)

      // Should show checkmark
      await waitFor(() => {
        expect(ibdButton.closest('button')).toHaveClass('bg-blue-50')
      })
    })

    it('toggles allergy selection', async () => {
      render(<SettingsPage />)

      const milkButton = screen.getByText('牛奶')
      fireEvent.click(milkButton)

      // Should show checkmark and red styling
      await waitFor(() => {
        expect(milkButton.closest('button')).toHaveClass('bg-red-50')
      })
    })

    it('toggles dietary restriction selection', async () => {
      render(<SettingsPage />)

      const vegetarianButton = screen.getByText('素食')
      fireEvent.click(vegetarianButton)

      // Should show checkmark and green styling
      await waitFor(() => {
        expect(vegetarianButton.closest('button')).toHaveClass('bg-green-50')
      })
    })

    it('loads existing user profile data', () => {
      mockSupabaseAuth.userProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        medical_conditions: ['發炎性腸病 (IBD)'],
        allergies: ['牛奶'],
        dietary_restrictions: ['素食'],
        medications: []
      }

      render(<SettingsPage />)

      // Check that selected items have the correct styling
      const ibdButton = screen.getByText('發炎性腸病 (IBD)').closest('button')
      const milkButton = screen.getByText('牛奶').closest('button')
      const vegetarianButton = screen.getByText('素食').closest('button')

      expect(ibdButton).toHaveClass('bg-blue-50')
      expect(milkButton).toHaveClass('bg-red-50')
      expect(vegetarianButton).toHaveClass('bg-green-50')
    })
  })

  describe('Save Functionality', () => {
    beforeEach(() => {
      mockSupabaseAuth.isLoading = false
      mockSupabaseAuth.isAuthenticated = true
      mockSupabaseAuth.user = {
        id: 'test-user-id',
        email: 'test@example.com'
      }
      mockSupabaseAuth.userProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        medical_conditions: [],
        allergies: [],
        dietary_restrictions: [],
        medications: []
      }
    })

    it('shows save button', () => {
      render(<SettingsPage />)
      expect(screen.getByText('💾 儲存設定')).toBeInTheDocument()
    })

    it('calls updateProfile when save button is clicked', async () => {
      mockSupabaseAuth.updateProfile.mockResolvedValue({})

      render(<SettingsPage />)

      // Select some options
      fireEvent.click(screen.getByText('發炎性腸病 (IBD)'))
      fireEvent.click(screen.getByText('牛奶'))
      fireEvent.click(screen.getByText('素食'))

      // Click save
      const saveButton = screen.getByText('💾 儲存設定')
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockSupabaseAuth.updateProfile).toHaveBeenCalledWith({
          medical_conditions: ['發炎性腸病 (IBD)'],
          allergies: ['牛奶'],
          dietary_restrictions: ['素食'],
          medications: [],
          preferences: {
            bodyMeasurements: {
              birthYear: null,
              gender: null,
              height: null,
              weight: null,
            },
          },
        })
      })
    })

    it('shows success message after successful save', async () => {
      mockSupabaseAuth.updateProfile.mockResolvedValue({})

      render(<SettingsPage />)

      const saveButton = screen.getByText('💾 儲存設定')
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(screen.getByText('✅ 設定已儲存成功！')).toBeInTheDocument()
      })
    })

    it('shows error message when save fails', async () => {
      mockSupabaseAuth.updateProfile.mockRejectedValue(new Error('Save failed'))

      render(<SettingsPage />)

      const saveButton = screen.getByText('💾 儲存設定')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('❌ 儲存失敗，請重試')).toBeInTheDocument()
      })
    })

    it('shows loading state during save', async () => {
      let resolvePromise: () => void
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockSupabaseAuth.updateProfile.mockReturnValue(savePromise)

      render(<SettingsPage />)

      const saveButton = screen.getByText('💾 儲存設定')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('儲存中...')).toBeInTheDocument()
      })

      // Resolve the promise to complete the test
      resolvePromise!()
      await savePromise
    })

    it('disables save button during save operation', async () => {
      let resolvePromise: () => void
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockSupabaseAuth.updateProfile.mockReturnValue(savePromise)

      render(<SettingsPage />)

      const saveButton = screen.getByText('💾 儲存設定')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(saveButton).toBeDisabled()
      })

      // Resolve the promise to complete the test
      resolvePromise!()
      await savePromise
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockSupabaseAuth.isLoading = false
      mockSupabaseAuth.isAuthenticated = true
      mockSupabaseAuth.user = {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    })

    it('has proper heading hierarchy', () => {
      render(<SettingsPage />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('設定')

      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)
    })

    it('has accessible buttons', () => {
      render(<SettingsPage />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeVisible()
      })
    })

    it('has proper link accessibility', () => {
      render(<SettingsPage />)

      const homeLink = screen.getByRole('link', { name: /返回首頁/ })
      expect(homeLink).toHaveAttribute('href', '/')
    })
  })
})