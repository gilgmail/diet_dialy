/**
 * Symptom Alert Service
 * Manages symptom alerts, thresholds, and notifications
 */

import { createAdminClient } from './server';
import { DailySymptomService } from './daily-symptom-service';
import type {
  SymptomAlert,
  SymptomAlertHistory,
  SymptomAlertType,
  SymptomThreshold,
  DailySymptomEntry,
  CoreSymptomScores
} from '@/types/medical';

export interface AlertFilters {
  alertType?: SymptomAlertType;
  isActive?: boolean;
  limit?: number;
}

export interface AlertHistoryFilters {
  alertType?: SymptomAlertType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export class SymptomAlertService {
  /**
   * Get user's alerts
   */
  static async getUserAlerts(
    userId: string,
    filters: AlertFilters = {}
  ): Promise<SymptomAlert[]> {
    try {
      const admin = createAdminClient();
      let query = admin
        .from('symptom_alerts')
        .select('*')
        .eq('user_id', userId);

      if (filters.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      query = query.order('created_at', { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user alerts:', error);
        throw error;
      }

      return (data || []).map(alert => this.transformDatabaseAlert(alert));
    } catch (error) {
      console.error('Error in getUserAlerts:', error);
      throw error;
    }
  }

  /**
   * Create new alert
   */
  static async createAlert(
    alertData: Omit<SymptomAlert, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SymptomAlert> {
    try {
      const admin = createAdminClient();
      const dbData = this.transformAlertForDatabase(alertData);

      const { data, error } = await admin
        .from('symptom_alerts')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating alert:', error);
        throw error;
      }

      return this.transformDatabaseAlert(data);
    } catch (error) {
      console.error('Error in createAlert:', error);
      throw error;
    }
  }

  /**
   * Update alert
   */
  static async updateAlert(
    alertId: string,
    userId: string,
    updates: Partial<SymptomAlert>
  ): Promise<SymptomAlert | null> {
    try {
      const admin = createAdminClient();
      const dbUpdates = this.transformAlertForDatabase(updates);
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await admin
        .from('symptom_alerts')
        .update(dbUpdates)
        .eq('id', alertId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error updating alert:', error);
        throw error;
      }

      return this.transformDatabaseAlert(data);
    } catch (error) {
      console.error('Error in updateAlert:', error);
      throw error;
    }
  }

  /**
   * Delete alert
   */
  static async deleteAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const admin = createAdminClient();
      const { error } = await admin
        .from('symptom_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting alert:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAlert:', error);
      return false;
    }
  }

  /**
   * Get alert history
   */
  static async getAlertHistory(
    userId: string,
    filters: AlertHistoryFilters = {}
  ): Promise<SymptomAlertHistory[]> {
    try {
      const admin = createAdminClient();
      let query = admin
        .from('symptom_alert_history')
        .select(`
          *,
          symptom_alerts!inner(alert_type, alert_name)
        `)
        .eq('user_id', userId);

      if (filters.alertType) {
        query = query.eq('symptom_alerts.alert_type', filters.alertType);
      }

      if (filters.startDate) {
        query = query.gte('triggered_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('triggered_at', filters.endDate);
      }

      query = query.order('triggered_at', { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alert history:', error);
        throw error;
      }

      return (data || []).map(history => this.transformDatabaseAlertHistory(history));
    } catch (error) {
      console.error('Error in getAlertHistory:', error);
      throw error;
    }
  }

  /**
   * Check alerts for new symptom entry
   */
  static async checkAlertsForEntry(
    userId: string,
    symptomEntry: DailySymptomEntry
  ): Promise<SymptomAlertHistory[]> {
    try {
      console.log('🚨 Checking alerts for symptom entry:', symptomEntry.id);

      // Get active alerts for user
      const alerts = await this.getUserAlerts(userId, { isActive: true });

      if (alerts.length === 0) {
        console.log('📋 No active alerts found for user');
        return [];
      }

      const triggeredAlerts: SymptomAlertHistory[] = [];

      for (const alert of alerts) {
        const triggered = await this.evaluateAlert(alert, symptomEntry);
        if (triggered) {
          triggeredAlerts.push(triggered);
        }
      }

      console.log(`🚨 Triggered ${triggeredAlerts.length} alerts`);
      return triggeredAlerts;

    } catch (error) {
      console.error('Error in checkAlertsForEntry:', error);
      return [];
    }
  }

  /**
   * Process missed entry alerts
   */
  static async checkMissedEntryAlerts(userId: string): Promise<SymptomAlertHistory[]> {
    try {
      const alerts = await this.getUserAlerts(userId, {
        isActive: true,
        alertType: 'missed_entry'
      });

      if (alerts.length === 0) return [];

      const triggeredAlerts: SymptomAlertHistory[] = [];
      const now = new Date();

      for (const alert of alerts) {
        const daysSinceLastEntry = await this.getDaysSinceLastEntry(userId);

        if (daysSinceLastEntry >= alert.duration_threshold) {
          const alertHistory = await this.triggerAlert(alert, null, {
            trigger_reason: `No symptom entry for ${daysSinceLastEntry} days`,
            days_missed: daysSinceLastEntry
          });

          if (alertHistory) {
            triggeredAlerts.push(alertHistory);
          }
        }
      }

      return triggeredAlerts;

    } catch (error) {
      console.error('Error in checkMissedEntryAlerts:', error);
      return [];
    }
  }

  /**
   * Private methods for alert evaluation and triggering
   */

  private static async evaluateAlert(
    alert: SymptomAlert,
    symptomEntry: DailySymptomEntry
  ): Promise<SymptomAlertHistory | null> {
    try {
      console.log(`🔍 Evaluating alert: ${alert.alert_name} (${alert.alert_type})`);

      switch (alert.alert_type) {
        case 'threshold_breach':
          return this.evaluateThresholdBreach(alert, symptomEntry);

        case 'symptom_deterioration':
          return this.evaluateSymptomDeterioriation(alert, symptomEntry);

        case 'symptom_improvement':
          return this.evaluateSymptomImprovement(alert, symptomEntry);

        case 'pattern_change':
          return this.evaluatePatternChange(alert, symptomEntry);

        case 'correlation_detected':
          return this.evaluateCorrelationDetected(alert, symptomEntry);

        default:
          console.log(`⚠️ Unknown alert type: ${alert.alert_type}`);
          return null;
      }
    } catch (error) {
      console.error(`Error evaluating alert ${alert.id}:`, error);
      return null;
    }
  }

  private static async evaluateThresholdBreach(
    alert: SymptomAlert,
    symptomEntry: DailySymptomEntry
  ): Promise<SymptomAlertHistory | null> {
    for (const threshold of alert.symptom_thresholds) {
      const symptomValue = symptomEntry[threshold.symptom];

      // Check if threshold is breached
      const isBreached = this.isThresholdBreached(symptomValue, threshold);

      if (isBreached) {
        // Check duration if required
        if (threshold.duration > 1) {
          const durationMet = await this.checkThresholdDuration(
            symptomEntry.user_id,
            threshold,
            threshold.duration
          );

          if (!durationMet) {
            console.log(`⏳ Threshold breached but duration not met: ${threshold.duration} days`);
            continue;
          }
        }

        return this.triggerAlert(alert, symptomEntry, {
          trigger_reason: `${threshold.symptom} threshold breached: ${symptomValue}`,
          threshold_details: threshold,
          symptom_value: symptomValue
        });
      }
    }

    return null;
  }

  private static async evaluateSymptomDeterioriation(
    alert: SymptomAlert,
    symptomEntry: DailySymptomEntry
  ): Promise<SymptomAlertHistory | null> {
    // Get recent entries to compare trends
    const recentEntries = await DailySymptomService.getRecentEntries(
      symptomEntry.user_id,
      alert.duration_threshold + 5
    );

    if (recentEntries.length < alert.duration_threshold) {
      return null;
    }

    // Calculate current vs baseline averages
    const currentPeriod = recentEntries.slice(0, alert.duration_threshold);
    const baselinePeriod = recentEntries.slice(alert.duration_threshold);

    const deteriorated = this.checkSymptomDeterioriation(
      currentPeriod,
      baselinePeriod,
      alert.severity_threshold
    );

    if (deteriorated) {
      return this.triggerAlert(alert, symptomEntry, {
        trigger_reason: 'Symptom deterioration detected over recent period',
        current_period_avg: this.calculatePeriodAverage(currentPeriod),
        baseline_period_avg: this.calculatePeriodAverage(baselinePeriod)
      });
    }

    return null;
  }

  private static async evaluateSymptomImprovement(
    alert: SymptomAlert,
    symptomEntry: DailySymptomEntry
  ): Promise<SymptomAlertHistory | null> {
    // Similar to deterioration but looking for improvement
    const recentEntries = await DailySymptomService.getRecentEntries(
      symptomEntry.user_id,
      alert.duration_threshold + 5
    );

    if (recentEntries.length < alert.duration_threshold) {
      return null;
    }

    const currentPeriod = recentEntries.slice(0, alert.duration_threshold);
    const baselinePeriod = recentEntries.slice(alert.duration_threshold);

    const improved = this.checkSymptomImprovement(
      currentPeriod,
      baselinePeriod,
      alert.severity_threshold
    );

    if (improved) {
      return this.triggerAlert(alert, symptomEntry, {
        trigger_reason: 'Symptom improvement detected over recent period',
        current_period_avg: this.calculatePeriodAverage(currentPeriod),
        baseline_period_avg: this.calculatePeriodAverage(baselinePeriod)
      });
    }

    return null;
  }

  private static async evaluatePatternChange(
    alert: SymptomAlert,
    symptomEntry: DailySymptomEntry
  ): Promise<SymptomAlertHistory | null> {
    // Placeholder for pattern change detection
    // This would require more sophisticated pattern analysis
    return null;
  }

  private static async evaluateCorrelationDetected(
    alert: SymptomAlert,
    symptomEntry: DailySymptomEntry
  ): Promise<SymptomAlertHistory | null> {
    // Placeholder for correlation detection
    // This would integrate with correlation analysis
    return null;
  }

  private static isThresholdBreached(
    value: number,
    threshold: SymptomThreshold
  ): boolean {
    if (threshold.min !== undefined && value < threshold.min) {
      return true;
    }
    if (threshold.max !== undefined && value > threshold.max) {
      return true;
    }
    return false;
  }

  private static async checkThresholdDuration(
    userId: string,
    threshold: SymptomThreshold,
    requiredDays: number
  ): Promise<boolean> {
    const entries = await DailySymptomService.getRecentEntries(userId, requiredDays);

    if (entries.length < requiredDays) {
      return false;
    }

    // Check if threshold was breached for all required days
    for (const entry of entries.slice(0, requiredDays)) {
      const value = entry[threshold.symptom];
      if (!this.isThresholdBreached(value, threshold)) {
        return false;
      }
    }

    return true;
  }

  private static checkSymptomDeterioriation(
    currentPeriod: DailySymptomEntry[],
    baselinePeriod: DailySymptomEntry[],
    threshold: number
  ): boolean {
    const currentAvg = this.calculatePeriodAverage(currentPeriod);
    const baselineAvg = this.calculatePeriodAverage(baselinePeriod);

    // For symptoms (not health), higher values indicate deterioration
    const deterioration = currentAvg.totalSymptoms - baselineAvg.totalSymptoms;
    return deterioration >= threshold;
  }

  private static checkSymptomImprovement(
    currentPeriod: DailySymptomEntry[],
    baselinePeriod: DailySymptomEntry[],
    threshold: number
  ): boolean {
    const currentAvg = this.calculatePeriodAverage(currentPeriod);
    const baselineAvg = this.calculatePeriodAverage(baselinePeriod);

    // For health, higher values indicate improvement
    const healthImprovement = currentAvg.overallHealth - baselineAvg.overallHealth;
    const symptomReduction = baselineAvg.totalSymptoms - currentAvg.totalSymptoms;

    return healthImprovement >= threshold || symptomReduction >= threshold;
  }

  private static calculatePeriodAverage(entries: DailySymptomEntry[]): {
    overallHealth: number;
    totalSymptoms: number;
  } {
    if (entries.length === 0) {
      return { overallHealth: 0, totalSymptoms: 0 };
    }

    const totals = entries.reduce(
      (acc, entry) => ({
        overallHealth: acc.overallHealth + entry.overall_health,
        totalSymptoms: acc.totalSymptoms + entry.abdominal_pain + entry.diarrhea + entry.bloody_stool + entry.bloating
      }),
      { overallHealth: 0, totalSymptoms: 0 }
    );

    return {
      overallHealth: totals.overallHealth / entries.length,
      totalSymptoms: totals.totalSymptoms / entries.length
    };
  }

  private static async getDaysSinceLastEntry(userId: string): Promise<number> {
    const entries = await DailySymptomService.getRecentEntries(userId, 1);

    if (entries.length === 0) {
      return 999; // Large number if no entries exist
    }

    const lastEntryDate = new Date(entries[0].recorded_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    lastEntryDate.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - lastEntryDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  private static async triggerAlert(
    alert: SymptomAlert,
    symptomEntry: DailySymptomEntry | null,
    triggerData: Record<string, any>
  ): Promise<SymptomAlertHistory | null> {
    try {
      console.log(`🚨 Triggering alert: ${alert.alert_name}`);

      const admin = createAdminClient();

      // Create alert history entry
      const alertHistory: Omit<SymptomAlertHistory, 'id' | 'created_at' | 'updated_at'> = {
        alert_id: alert.id,
        user_id: alert.user_id,
        triggered_at: new Date(),
        trigger_symptom_entry: symptomEntry?.id,
        trigger_reason: triggerData.trigger_reason,
        trigger_data: triggerData,
        notification_sent: false,
        notification_channels_used: [],
        notification_delivery_status: {}
      };

      const { data, error } = await admin
        .from('symptom_alert_history')
        .insert(this.transformAlertHistoryForDatabase(alertHistory))
        .select()
        .single();

      if (error) {
        console.error('Error creating alert history:', error);
        throw error;
      }

      // Update alert trigger count and last triggered time
      await admin
        .from('symptom_alerts')
        .update({
          trigger_count: alert.trigger_count + 1,
          last_triggered_at: new Date().toISOString()
        })
        .eq('id', alert.id);

      // Send notifications based on alert configuration
      if (alert.notification_frequency !== 'disabled') {
        await this.sendAlertNotifications(alert, this.transformDatabaseAlertHistory(data));
      }

      console.log('✅ Alert triggered and notifications sent');
      return this.transformDatabaseAlertHistory(data);

    } catch (error) {
      console.error('Error triggering alert:', error);
      return null;
    }
  }

  private static async sendAlertNotifications(
    alert: SymptomAlert,
    alertHistory: SymptomAlertHistory
  ): Promise<void> {
    try {
      console.log(`📬 Sending notifications for alert: ${alert.alert_name}`);

      const channelsUsed: string[] = [];
      const deliveryStatus: Record<string, any> = {};

      for (const channel of alert.notification_channels) {
        switch (channel) {
          case 'app':
            // In-app notification (placeholder)
            deliveryStatus.app = { status: 'sent', timestamp: new Date().toISOString() };
            channelsUsed.push('app');
            break;

          case 'email':
            // Email notification (placeholder)
            deliveryStatus.email = { status: 'sent', timestamp: new Date().toISOString() };
            channelsUsed.push('email');
            break;

          case 'sms':
            // SMS notification (placeholder)
            deliveryStatus.sms = { status: 'sent', timestamp: new Date().toISOString() };
            channelsUsed.push('sms');
            break;
        }
      }

      const admin = createAdminClient();

      // Update alert history with notification status
      await admin
        .from('symptom_alert_history')
        .update({
          notification_sent: true,
          notification_channels_used: channelsUsed,
          notification_delivery_status: deliveryStatus
        })
        .eq('id', alertHistory.id);

      console.log(`✅ Notifications sent via: ${channelsUsed.join(', ')}`);

    } catch (error) {
      console.error('Error sending alert notifications:', error);
    }
  }

  /**
   * Transform methods
   */

  private static transformAlertForDatabase(alert: any): any {
    const dbAlert = { ...alert };

    // Convert Date objects to ISO strings
    if (alert.last_triggered_at instanceof Date) {
      dbAlert.last_triggered_at = alert.last_triggered_at.toISOString();
    }

    // Remove fields that shouldn't be in database
    delete dbAlert.id;
    delete dbAlert.created_at;
    delete dbAlert.updated_at;

    return dbAlert;
  }

  private static transformDatabaseAlert(dbAlert: any): SymptomAlert {
    return {
      id: dbAlert.id,
      user_id: dbAlert.user_id,
      alert_type: dbAlert.alert_type,
      alert_name: dbAlert.alert_name,
      description: dbAlert.description,
      symptom_thresholds: dbAlert.symptom_thresholds,
      severity_threshold: dbAlert.severity_threshold,
      duration_threshold: dbAlert.duration_threshold,
      trigger_conditions: dbAlert.trigger_conditions,
      notification_frequency: dbAlert.notification_frequency,
      notification_channels: dbAlert.notification_channels,
      is_active: dbAlert.is_active,
      last_triggered_at: dbAlert.last_triggered_at ? new Date(dbAlert.last_triggered_at) : undefined,
      trigger_count: dbAlert.trigger_count,
      escalation_rules: dbAlert.escalation_rules,
      created_at: new Date(dbAlert.created_at),
      updated_at: new Date(dbAlert.updated_at)
    };
  }

  private static transformAlertHistoryForDatabase(history: any): any {
    const dbHistory = { ...history };

    // Convert Date objects to ISO strings
    if (history.triggered_at instanceof Date) {
      dbHistory.triggered_at = history.triggered_at.toISOString();
    }
    if (history.acknowledged_at instanceof Date) {
      dbHistory.acknowledged_at = history.acknowledged_at.toISOString();
    }
    if (history.resolved_at instanceof Date) {
      dbHistory.resolved_at = history.resolved_at.toISOString();
    }

    // Remove fields that shouldn't be in database
    delete dbHistory.id;
    delete dbHistory.created_at;
    delete dbHistory.updated_at;

    return dbHistory;
  }

  private static transformDatabaseAlertHistory(dbHistory: any): SymptomAlertHistory {
    return {
      id: dbHistory.id,
      alert_id: dbHistory.alert_id,
      user_id: dbHistory.user_id,
      triggered_at: new Date(dbHistory.triggered_at),
      trigger_symptom_entry: dbHistory.trigger_symptom_entry,
      trigger_reason: dbHistory.trigger_reason,
      trigger_data: dbHistory.trigger_data,
      acknowledged_at: dbHistory.acknowledged_at ? new Date(dbHistory.acknowledged_at) : undefined,
      resolved_at: dbHistory.resolved_at ? new Date(dbHistory.resolved_at) : undefined,
      resolution_action: dbHistory.resolution_action,
      resolution_notes: dbHistory.resolution_notes,
      notification_sent: dbHistory.notification_sent,
      notification_channels_used: dbHistory.notification_channels_used,
      notification_delivery_status: dbHistory.notification_delivery_status,
      was_helpful: dbHistory.was_helpful,
      user_feedback: dbHistory.user_feedback,
      created_at: new Date(dbHistory.created_at),
      updated_at: new Date(dbHistory.updated_at)
    };
  }
}