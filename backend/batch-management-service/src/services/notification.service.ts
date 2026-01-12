import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';
import { logger } from '../utils/logger';
import { query } from '../config/database';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  IN_APP = 'in-app'
}

export enum NotificationSeverity {
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export interface NotificationPayload {
  tenant_id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  channels: NotificationChannel[];
  recipients?: string[];
  webhook_url?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    this.initializeEmailTransporter();
    this.initializeTwilioClient();
  }

  /**
   * Initialize email transporter (SMTP)
   */
  private initializeEmailTransporter(): void {
    const emailConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
      this.emailTransporter = nodemailer.createTransporter(emailConfig);
      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email configuration incomplete, email notifications disabled');
    }
  }

  /**
   * Initialize Twilio client for SMS
   */
  private initializeTwilioClient(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      logger.info('Twilio client initialized');
    } else {
      logger.warn('Twilio configuration incomplete, SMS notifications disabled');
    }
  }

  /**
   * Send notification through multiple channels
   */
  async sendNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    results: { channel: string; success: boolean; error?: string }[];
  }> {
    const results: { channel: string; success: boolean; error?: string }[] = [];

    for (const channel of payload.channels) {
      try {
        switch (channel) {
          case NotificationChannel.EMAIL:
            await this.sendEmailNotification(payload);
            results.push({ channel: 'email', success: true });
            break;

          case NotificationChannel.SMS:
            await this.sendSMSNotification(payload);
            results.push({ channel: 'sms', success: true });
            break;

          case NotificationChannel.WEBHOOK:
            await this.sendWebhookNotification(payload);
            results.push({ channel: 'webhook', success: true });
            break;

          case NotificationChannel.IN_APP:
            await this.createInAppNotification(payload);
            results.push({ channel: 'in-app', success: true });
            break;

          default:
            logger.warn(`Unknown notification channel: ${channel}`);
        }
      } catch (error) {
        logger.error(`Error sending ${channel} notification:`, error);
        results.push({
          channel,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const allSuccess = results.every(r => r.success);

    return {
      success: allSuccess,
      results
    };
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }

    const recipients = payload.recipients || await this.getNotificationRecipients(
      payload.tenant_id,
      NotificationChannel.EMAIL,
      payload.severity
    );

    if (recipients.length === 0) {
      logger.warn('No email recipients found');
      return;
    }

    const emailHtml = this.generateEmailTemplate(payload);

    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'Genesis WMS <noreply@genesis-wms.com>',
      to: recipients.join(', '),
      subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
      text: payload.message,
      html: emailHtml
    });

    logger.info(`Email notification sent to ${recipients.length} recipients`);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(payload: NotificationPayload): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const recipients = payload.recipients || await this.getNotificationRecipients(
      payload.tenant_id,
      NotificationChannel.SMS,
      payload.severity
    );

    if (recipients.length === 0) {
      logger.warn('No SMS recipients found');
      return;
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    const smsBody = `[${payload.severity.toUpperCase()}] ${payload.title}\n\n${payload.message}`;

    const sendPromises = recipients.map(async (phoneNumber) => {
      try {
        await this.twilioClient!.messages.create({
          body: smsBody,
          from: fromNumber,
          to: phoneNumber
        });
      } catch (error) {
        logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      }
    });

    await Promise.all(sendPromises);

    logger.info(`SMS notifications sent to ${recipients.length} recipients`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(payload: NotificationPayload): Promise<void> {
    const webhookUrl = payload.webhook_url || await this.getWebhookUrl(payload.tenant_id);

    if (!webhookUrl) {
      logger.warn('No webhook URL configured');
      return;
    }

    const timeout = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000');
    const retryAttempts = parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3');

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        await axios.post(
          webhookUrl,
          {
            event_type: 'notification',
            severity: payload.severity,
            title: payload.title,
            message: payload.message,
            metadata: payload.metadata,
            timestamp: new Date().toISOString()
          },
          {
            timeout,
            headers: {
              'Content-Type': 'application/json',
              'X-Genesis-WMS-Event': 'notification'
            }
          }
        );

        logger.info(`Webhook notification sent successfully (attempt ${attempt})`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Webhook notification failed (attempt ${attempt}/${retryAttempts}):`, error);

        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`Webhook notification failed after ${retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Create in-app notification (stored in database)
   */
  private async createInAppNotification(payload: NotificationPayload): Promise<void> {
    await query(
      `
      INSERT INTO inventory_alerts (
        tenant_id, alert_type, severity, message, channels, metadata, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        payload.tenant_id,
        'batch_expiry',
        payload.severity,
        payload.message,
        JSON.stringify([NotificationChannel.IN_APP]),
        JSON.stringify(payload.metadata || {}),
        'active'
      ]
    );

    logger.info('In-app notification created');
  }

  /**
   * Get notification recipients from tenant settings
   */
  private async getNotificationRecipients(
    tenantId: string,
    channel: NotificationChannel,
    severity: NotificationSeverity
  ): Promise<string[]> {
    // Query users with notification preferences
    const result = await query(
      `
      SELECT DISTINCT
        CASE
          WHEN $2 = 'email' THEN u.email
          WHEN $2 = 'sms' THEN u.phone_number
        END as contact
      FROM users u
      WHERE u.tenant_id = $1
        AND u.status = 'active'
        AND (
          u.role IN ('warehouse_manager', 'inventory_analyst', 'tenant_admin')
          OR ($3 = 'emergency' AND u.role = 'qa_supervisor')
        )
        AND (
          CASE
            WHEN $2 = 'email' THEN u.email IS NOT NULL
            WHEN $2 = 'sms' THEN u.phone_number IS NOT NULL
            ELSE false
          END
        )
      `,
      [tenantId, channel, severity]
    );

    return result.rows.map(r => r.contact).filter(c => c !== null);
  }

  /**
   * Get webhook URL from tenant configuration
   */
  private async getWebhookUrl(tenantId: string): Promise<string | null> {
    const result = await query(
      `
      SELECT settings->>'notification_webhook_url' as webhook_url
      FROM tenants
      WHERE id = $1
      `,
      [tenantId]
    );

    return result.rows.length > 0 ? result.rows[0].webhook_url : null;
  }

  /**
   * Generate HTML email template
   */
  private generateEmailTemplate(payload: NotificationPayload): string {
    const severityColors = {
      warning: '#FFA500',
      critical: '#FF6347',
      emergency: '#DC143C'
    };

    const color = severityColors[payload.severity] || '#666';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .severity { display: inline-block; padding: 5px 10px; background-color: ${color}; color: white; border-radius: 3px; font-weight: bold; text-transform: uppercase; }
          .metadata { background-color: #fff; padding: 15px; margin-top: 15px; border-left: 3px solid ${color}; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${payload.title}</h2>
          </div>
          <div class="content">
            <p><span class="severity">${payload.severity}</span></p>
            <p>${payload.message}</p>
            ${payload.metadata ? `
              <div class="metadata">
                <strong>Additional Information:</strong>
                <pre>${JSON.stringify(payload.metadata, null, 2)}</pre>
              </div>
            ` : ''}
            <div class="footer">
              <p>This is an automated notification from Genesis WMS. Please do not reply to this email.</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const notificationService = new NotificationService();
