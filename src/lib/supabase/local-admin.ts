// 本地 Supabase 管理工具
import { createClient } from './client'

export interface DatabaseStats {
  tables: Array<{
    name: string
    count: number
    size?: string
    lastUpdated?: string
  }>
  totalRecords: number
  databaseSize?: string
  connectionStatus: 'connected' | 'disconnected' | 'error'
}

export interface TableInfo {
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    default?: string
  }>
  indexes: string[]
  constraints: string[]
  recordCount: number
}

export interface BackupInfo {
  timestamp: string
  tables: string[]
  size: number
  records: number
}

export class LocalSupabaseAdmin {
  private getSupabaseClient() {
    return createClient()
  }

  private connectionTest: boolean = false

  // 測試連接
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabaseClient()
    try {
      const { data, error } = await supabase
        .from('diet_daily_foods')
        .select('id')
        .limit(1)

      if (error) {
        return { success: false, error: error.message }
      }

      this.connectionTest = true
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // 獲取數據庫統計信息
  async getDatabaseStats(): Promise<DatabaseStats> {
    const supabase = this.getSupabaseClient()
    const tables = [
      'diet_daily_foods',
      'diet_daily_users',
      'food_entries',
      'medical_reports',
      'symptom_tracking'
    ]

    const stats: DatabaseStats = {
      tables: [],
      totalRecords: 0,
      connectionStatus: 'disconnected'
    }

    try {
      // 測試連接
      const connectionResult = await this.testConnection()
      stats.connectionStatus = connectionResult.success ? 'connected' : 'error'

      if (!connectionResult.success) {
        return stats
      }

      // 獲取每個表的統計
      for (const tableName of tables) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })

          if (error && !error.message.includes('does not exist')) {
            console.warn(`Table ${tableName} query failed:`, error.message)
            continue
          }

          const recordCount = count || 0
          stats.totalRecords += recordCount

          // 獲取最近更新時間
          let lastUpdated: string | undefined
          try {
            const { data: recentData } = await supabase
              .from(tableName)
              .select('updated_at, created_at')
              .order('updated_at', { ascending: false })
              .limit(1)

            if (recentData && recentData.length > 0) {
              lastUpdated = recentData[0].updated_at || recentData[0].created_at
            }
          } catch (e) {
            // 某些表可能沒有 updated_at 字段
          }

          stats.tables.push({
            name: tableName,
            count: recordCount,
            lastUpdated
          })

        } catch (err: any) {
          console.warn(`Failed to get stats for ${tableName}:`, err.message)
          stats.tables.push({
            name: tableName,
            count: 0
          })
        }
      }

      return stats

    } catch (err: any) {
      stats.connectionStatus = 'error'
      return stats
    }
  }

  // 獲取表詳細信息
  async getTableInfo(tableName: string): Promise<TableInfo | null> {
    const supabase = this.getSupabaseClient()
    try {
      // 獲取記錄數量
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      // 獲取示例記錄來推斷結構
      const { data: sampleData } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      const columns: TableInfo['columns'] = []

      if (sampleData && sampleData.length > 0) {
        const sample = sampleData[0]
        Object.keys(sample).forEach(key => {
          const value = sample[key]
          let type = 'unknown'

          if (typeof value === 'string') {
            type = key.includes('_at') ? 'timestamptz' : 'text'
          } else if (typeof value === 'number') {
            type = Number.isInteger(value) ? 'integer' : 'decimal'
          } else if (typeof value === 'boolean') {
            type = 'boolean'
          } else if (value === null) {
            type = 'nullable'
          } else if (typeof value === 'object') {
            type = 'jsonb'
          }

          columns.push({
            name: key,
            type,
            nullable: value === null
          })
        })
      }

      return {
        name: tableName,
        columns,
        indexes: [], // 簡化版，實際需要 SQL 查詢獲取
        constraints: [],
        recordCount: count || 0
      }

    } catch (err: any) {
      console.error(`Failed to get table info for ${tableName}:`, err.message)
      return null
    }
  }

  // 執行自定義 SQL 查詢（只讀）
  async executeQuery(query: string): Promise<{ data: any[] | null; error?: string }> {
    try {
      // 安全檢查：只允許 SELECT 查詢
      const trimmedQuery = query.trim().toLowerCase()
      if (!trimmedQuery.startsWith('select')) {
        return { data: null, error: '只允許 SELECT 查詢' }
      }

      // 這裡需要使用 Supabase 的 RPC 功能或直接 SQL 執行
      // 由於限制，我們使用預定義的查詢
      const result = await this.executePredefinedQuery(query)
      return result

    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  // 預定義查詢
  private async executePredefinedQuery(query: string): Promise<{ data: any[] | null; error?: string }> {
    const queryLower = query.toLowerCase().trim()

    try {
      // 獲取所有食物
      if (queryLower.includes('select * from diet_daily_foods')) {
        const { data, error } = await supabase
          .from('diet_daily_foods')
          .select('*')
          .limit(100)

        return { data, error: error?.message }
      }

      // 獲取用戶列表
      if (queryLower.includes('select * from diet_daily_users')) {
        const { data, error } = await supabase
          .from('diet_daily_users')
          .select('*')
          .limit(100)

        return { data, error: error?.message }
      }

      // 獲取食物記錄
      if (queryLower.includes('select * from food_entries')) {
        const { data, error } = await supabase
          .from('food_entries')
          .select('*')
          .limit(100)

        return { data, error: error?.message }
      }

      // 統計查詢
      if (queryLower.includes('count(*)')) {
        const tables = ['diet_daily_foods', 'diet_daily_users', 'food_entries']
        const results = []

        for (const table of tables) {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })

          results.push({ table, count })
        }

        return { data: results }
      }

      return { data: null, error: '不支持的查詢類型' }

    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  // 數據備份
  async createBackup(tables: string[] = []): Promise<BackupInfo | null> {
    try {
      const backupTables = tables.length > 0 ? tables : [
        'diet_daily_foods',
        'diet_daily_users',
        'food_entries'
      ]

      const backup: any = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: {}
      }

      let totalRecords = 0

      for (const tableName of backupTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')

          if (error) {
            console.warn(`Backup failed for ${tableName}:`, error.message)
            continue
          }

          backup.tables[tableName] = data || []
          totalRecords += (data || []).length

        } catch (err: any) {
          console.warn(`Backup error for ${tableName}:`, err.message)
        }
      }

      // 保存到本地文件
      const backupString = JSON.stringify(backup, null, 2)
      const backupSize = new Blob([backupString]).size

      // 使用瀏覽器下載
      if (typeof window !== 'undefined') {
        const blob = new Blob([backupString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `supabase-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      return {
        timestamp: backup.timestamp,
        tables: backupTables,
        size: backupSize,
        records: totalRecords
      }

    } catch (err: any) {
      console.error('Backup failed:', err.message)
      return null
    }
  }

  // 實時監控
  async startMonitoring(interval: number = 10000): Promise<() => void> {
    const monitorInterval = setInterval(async () => {
      const stats = await this.getDatabaseStats()
      console.log('📊 數據庫監控:', {
        時間: new Date().toLocaleTimeString('zh-TW'),
        連接狀態: stats.connectionStatus,
        總記錄數: stats.totalRecords,
        表統計: stats.tables.map(t => `${t.name}:${t.count}`)
      })
    }, interval)

    return () => clearInterval(monitorInterval)
  }

  // 健康檢查
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error'
    checks: Array<{
      name: string
      status: 'pass' | 'fail' | 'warning'
      message: string
    }>
  }> {
    const checks = []

    // 連接檢查
    const connectionResult = await this.testConnection()
    checks.push({
      name: '數據庫連接',
      status: connectionResult.success ? 'pass' : 'fail',
      message: connectionResult.success ? '連接正常' : connectionResult.error || '連接失敗'
    })

    // 表存在性檢查
    const tables = ['diet_daily_foods', 'diet_daily_users', 'food_entries']
    for (const table of tables) {
      try {
    const { data, error } = await supabase.from(table).select('id').limit(1)
        checks.push({
          name: `${table} 表`,
          status: 'pass',
          message: '表存在且可訪問'
        })
      } catch (err: any) {
        checks.push({
          name: `${table} 表`,
          status: 'fail',
          message: err.message
        })
      }
    }

    // 數據完整性檢查
    try {
      const { count: foodCount } = await supabase
        .from('diet_daily_foods')
        .select('*', { count: 'exact', head: true })

      checks.push({
        name: '食物數據',
        status: (foodCount || 0) > 0 ? 'pass' : 'warning',
        message: `食物記錄數: ${foodCount || 0}`
      })
    } catch (err) {
      checks.push({
        name: '食物數據',
        status: 'fail',
        message: '無法檢查食物數據'
      })
    }

    // 確定整體狀態
    const failCount = checks.filter(c => c.status === 'fail').length
    const warningCount = checks.filter(c => c.status === 'warning').length

    let status: 'healthy' | 'warning' | 'error'
    if (failCount > 0) {
      status = 'error'
    } else if (warningCount > 0) {
      status = 'warning'
    } else {
      status = 'healthy'
    }

    return { status, checks }
  }
}

// 創建全局實例
export const localSupabaseAdmin = new LocalSupabaseAdmin()
