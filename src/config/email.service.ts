import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
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

  async sendVerificationEmail(to: string, code: string): Promise<boolean> {
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
          <h2>Email Verification</h2>
          <p>Thank you for registering with MuPay. Please use the following verification code to complete your registration:</p>
          <div class="code-box">
            <span class="code">${code}</span>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MuPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'MuPay - Email Verification Code',
        html,
      });
      this.logger.log(`Verification email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      // In development, log the code instead of failing
      if (this.configService.get<string>('nodeEnv') === 'development') {
        this.logger.warn(`[DEV] Verification code for ${to}: ${code}`);
        return true;
      }
      return false;
    }
  }
}
