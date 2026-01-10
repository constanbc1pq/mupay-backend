import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type EmailPurpose =
  | 'verification'
  | 'email_bind'
  | 'email_change'
  | 'password_reset'
  | 'payment_password_reset'
  | '2fa_enable';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly isDev: boolean;

  constructor(private configService: ConfigService) {
    this.isDev = this.configService.get<string>('nodeEnv') === 'development';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.password'),
      },
    });
  }

  private getEmailTemplate(
    purpose: EmailPurpose,
    code: string,
  ): { subject: string; title: string; description: string } {
    const templates: Record<EmailPurpose, { subject: string; title: string; description: string }> = {
      verification: {
        subject: 'MuPay - Email Verification Code',
        title: 'Email Verification',
        description: 'Thank you for registering with MuPay. Please use the following verification code to complete your registration:',
      },
      email_bind: {
        subject: 'MuPay - Bind Email Verification Code',
        title: 'Bind Email Address',
        description: 'You are binding this email address to your MuPay account. Please use the following verification code:',
      },
      email_change: {
        subject: 'MuPay - Change Email Verification Code',
        title: 'Change Email Address',
        description: 'You are changing your email address. Please use the following verification code to confirm:',
      },
      password_reset: {
        subject: 'MuPay - Reset Password Verification Code',
        title: 'Reset Password',
        description: 'You requested to reset your password. Please use the following verification code:',
      },
      payment_password_reset: {
        subject: 'MuPay - Reset Payment Password',
        title: 'Reset Payment Password',
        description: 'You requested to reset your payment password. Please use the following verification code:',
      },
      '2fa_enable': {
        subject: 'MuPay - Enable Two-Factor Authentication',
        title: 'Enable 2FA',
        description: 'You are enabling two-factor authentication. Please use the following verification code to confirm:',
      },
    };

    return templates[purpose];
  }

  async sendCode(
    to: string,
    code: string,
    purpose: EmailPurpose = 'verification',
  ): Promise<boolean> {
    const template = this.getEmailTemplate(purpose, code);
    const from = this.configService.get<string>('email.from');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 32px; font-weight: bold; color: #3B82F6; }
          .code-box {
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            border-radius: 8px;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #3B82F6;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">MuPay</div>
          </div>
          <h2>${template.title}</h2>
          <p>${template.description}</p>
          <div class="code-box">
            <span class="code">${code}</span>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MuPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // In development mode, always log to console and return success
    if (this.isDev) {
      this.logger.warn(`\n========================================`);
      this.logger.warn(`[DEV EMAIL] To: ${to}`);
      this.logger.warn(`[DEV EMAIL] Purpose: ${purpose}`);
      this.logger.warn(`[DEV EMAIL] Code: ${code}`);
      this.logger.warn(`========================================\n`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: template.subject,
        html,
      });
      this.logger.log(`Email sent to ${to} for ${purpose}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      return false;
    }
  }

  // Legacy method for backward compatibility
  async sendVerificationEmail(to: string, code: string): Promise<boolean> {
    return this.sendCode(to, code, 'verification');
  }
}
