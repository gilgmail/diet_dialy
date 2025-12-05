// Bowel Movement Diary Types
// Each bowel movement is tracked individually

export interface BowelMovementEntry {
  id: string
  user_id: string
  occurred_at: string // ISO timestamp
  recorded_date: string // YYYY-MM-DD format

  // Core tracking
  stool_type: StoolType // Bristol Stool Scale (1-5)
  has_blood: boolean

  // Optional fields
  difficulty?: DifficultyLevel
  duration_minutes?: number
  notes?: string

  created_at: string
  updated_at: string
}

// Bristol Stool Scale (simplified to 1-5)
export type StoolType = 1 | 2 | 3 | 4 | 5

export type DifficultyLevel = 'normal' | 'difficult' | 'urgent'

export interface CreateBowelMovementInput {
  stool_type: StoolType
  has_blood?: boolean
  difficulty?: DifficultyLevel
  duration_minutes?: number
  notes?: string
  occurred_at?: string // ISO date string, defaults to now
}

export interface UpdateBowelMovementInput {
  stool_type?: StoolType
  has_blood?: boolean
  difficulty?: DifficultyLevel
  duration_minutes?: number
  notes?: string
  occurred_at?: string
}

// Bristol Stool Scale definitions
export const STOOL_TYPES: {
  value: StoolType
  label: string
  description: string
  icon: string
  color: string
}[] = [
  {
    value: 1,
    label: '便秘',
    description: '硬球狀',
    icon: '🔴',
    color: '#8B4513'
  },
  {
    value: 2,
    label: '偏硬',
    description: '香腸狀但凹凸',
    icon: '🟠',
    color: '#A0522D'
  },
  {
    value: 3,
    label: '正常',
    description: '香腸狀光滑',
    icon: '🟡',
    color: '#D2691E'
  },
  {
    value: 4,
    label: '偏軟',
    description: '軟便成形',
    icon: '🟢',
    color: '#CD853F'
  },
  {
    value: 5,
    label: '腹瀉',
    description: '糊狀或液狀',
    icon: '💧',
    color: '#4A90E2'
  },
]

export const DIFFICULTY_LEVELS: {
  value: DifficultyLevel
  label: string
  icon: string
  color: string
}[] = [
  { value: 'normal', label: '正常', icon: '😊', color: '#10B981' },
  { value: 'difficult', label: '困難', icon: '😣', color: '#F59E0B' },
  { value: 'urgent', label: '急迫', icon: '🏃', color: '#EF4444' },
]

export const BLOOD_STATUS: {
  value: boolean
  label: string
  icon: string
  color: string
}[] = [
  { value: false, label: '無', icon: '✅', color: '#10B981' },
  { value: true, label: '有血便', icon: '⚠️', color: '#EF4444' },
]
