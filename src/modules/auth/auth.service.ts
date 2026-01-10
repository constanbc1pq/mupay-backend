import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { User } from '@database/entities/user.entity';
import { RedisService } from '@config/redis.service';
import { EmailService } from '@config/email.service';
import { NotificationService } from '@modules/notification/notification.service';
import { MSG } from '@common/constants/messages';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SendVerifyEmailDto, VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly VERIFY_CODE_TTL = 10 * 60; // 10 minutes in seconds
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) {
    const googleClientId = this.configService.get<string>('google.clientId');
    this.googleClient = new OAuth2Client(googleClientId);
  }

  /**
   * User login with email
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(MSG.AUTH_INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(MSG.AUTH_INVALID_CREDENTIALS);
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(MSG.AUTH_EMAIL_NOT_VERIFIED);
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(MSG.AUTH_USER_DISABLED);
    }

    return this.generateTokens(user);
  }

  /**
   * User registration - creates pending user and sends verification email
   */
  async register(registerDto: RegisterDto) {
    const { email, password, phone } = registerDto;

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new ConflictException(MSG.AUTH_EMAIL_EXISTS);
      }

      // Dev environment: auto-verify existing unverified user
      const isDev = this.configService.get('nodeEnv') === 'development';
      if (isDev) {
        this.logger.log(`[DEV] Auto-verifying existing user ${email}`);
        existingUser.emailVerified = true;
        await this.userRepository.save(existingUser);
        return this.generateTokens(existingUser);
      }

      // Production: resend verification email
      await this.sendVerificationCode(email);
      return {
        messageId: MSG.AUTH_REGISTER_PENDING,
        email,
      };
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone },
      });
      if (existingPhone) {
        throw new ConflictException(MSG.AUTH_PHONE_EXISTS);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate username from email
    const emailPrefix = email.split('@')[0];
    const username = `${emailPrefix}_${uuidv4().substring(0, 6)}`;

    // Create user (not verified yet)
    const user = this.userRepository.create({
      email,
      username,
      password: hashedPassword,
      phone,
      nickname: emailPrefix,
      emailVerified: false,
    });

    await this.userRepository.save(user);

    // Dev environment: skip email verification, auto-login
    const isDev = this.configService.get('nodeEnv') === 'development';
    if (isDev) {
      this.logger.log(`[DEV] Auto-verifying email for ${email}`);
      user.emailVerified = true;
      await this.userRepository.save(user);

      // Send welcome message
      try {
        await this.notificationService.sendWelcomeMessage(user.id, user.nickname || user.username);
      } catch (error) {
        this.logger.error(`Failed to send welcome message`, error);
      }

      // Return tokens directly
      return this.generateTokens(user);
    }

    // Production: send verification email
    await this.sendVerificationCode(email);

    return {
      messageId: MSG.AUTH_REGISTER_PENDING,
      email,
    };
  }

  /**
   * Send verification code to email
   */
  async sendVerificationEmail(dto: SendVerifyEmailDto) {
    const { email } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException(MSG.AUTH_USER_NOT_FOUND);
    }

    if (user.emailVerified) {
      throw new BadRequestException(MSG.AUTH_EMAIL_EXISTS);
    }

    const devCode = await this.sendVerificationCode(email);

    return {
      messageId: MSG.AUTH_VERIFY_EMAIL_SENT,
      ...(devCode && { devCode }), // Only include in dev environment
    };
  }

  /**
   * Verify email with code
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const { email, code } = dto;

    // Get stored code from Redis
    const storedCode = await this.redisService.get(`verify:${email}`);

    if (!storedCode) {
      throw new BadRequestException(MSG.AUTH_CODE_EXPIRED);
    }

    if (storedCode !== code) {
      throw new BadRequestException(MSG.AUTH_CODE_INVALID);
    }

    // Find user and verify
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException(MSG.AUTH_USER_NOT_FOUND);
    }

    // Mark email as verified
    user.emailVerified = true;
    await this.userRepository.save(user);

    // Delete verification code from Redis
    await this.redisService.del(`verify:${email}`);

    // Send welcome message to new user
    try {
      await this.notificationService.sendWelcomeMessage(user.id, user.nickname || user.username);
      this.logger.log(`Welcome message sent to user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome message to user ${user.id}`, error);
    }

    // Return tokens for auto-login
    return this.generateTokens(user);
  }

  /**
   * Google OAuth login
   */
  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const { idToken } = googleAuthDto;

    // Verify Google ID token
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('google.clientId'),
      });
      payload = ticket.getPayload();
    } catch (error) {
      this.logger.error('Google ID token verification failed', error);
      throw new UnauthorizedException(MSG.AUTH_GOOGLE_TOKEN_INVALID);
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException(MSG.AUTH_GOOGLE_TOKEN_INVALID);
    }

    const googleUser = {
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      googleId: payload.sub,
      picture: payload.picture,
    };

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { googleId: googleUser.googleId },
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: googleUser.email },
      });

      if (user) {
        // Link Google account to existing user
        user.googleId = googleUser.googleId;
        user.emailVerified = true; // Google verified the email
        if (!user.avatar && googleUser.picture) {
          user.avatar = googleUser.picture;
        }
        await this.userRepository.save(user);
      } else {
        // Create new user
        user = this.userRepository.create({
          username: `google_${uuidv4().substring(0, 8)}`,
          email: googleUser.email,
          nickname: googleUser.name,
          googleId: googleUser.googleId,
          avatar: googleUser.picture,
          emailVerified: true, // Google verified the email
          password: await bcrypt.hash(uuidv4(), 10), // Random password for Google users
        });
        await this.userRepository.save(user);

        // Send welcome message to new Google user
        try {
          await this.notificationService.sendWelcomeMessage(user.id, user.nickname || user.username);
          this.logger.log(`Welcome message sent to Google user ${user.id}`);
        } catch (error) {
          this.logger.error(`Failed to send welcome message to Google user ${user.id}`, error);
        }
      }
    }

    return this.generateTokens(user);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    // Verify refresh token exists in Redis
    const storedUserId = await this.redisService.get(`rt:${refreshToken}`);

    if (!storedUserId) {
      throw new UnauthorizedException(MSG.AUTH_TOKEN_INVALID);
    }

    const user = await this.userRepository.findOne({
      where: { id: storedUserId },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException(MSG.AUTH_USER_DISABLED);
    }

    // Delete old refresh token
    await this.redisService.del(`rt:${refreshToken}`);

    return this.generateTokens(user);
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(refreshToken: string) {
    await this.redisService.del(`rt:${refreshToken}`);
    return { messageId: MSG.AUTH_LOGOUT_SUCCESS };
  }

  /**
   * Send verification code to email
   * Returns the code in dev environment for testing
   */
  private async sendVerificationCode(email: string): Promise<string | null> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with expiry
    await this.redisService.setWithExpiry(
      `verify:${email}`,
      code,
      this.VERIFY_CODE_TTL,
    );

    // Send email
    await this.emailService.sendVerificationEmail(email, code);

    // Return code in dev environment for testing convenience
    const isDev = this.configService.get('nodeEnv') === 'development';
    return isDev ? code : null;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    // Store refresh token in Redis
    await this.redisService.setWithExpiry(
      `rt:${refreshToken}`,
      user.id,
      this.REFRESH_TOKEN_TTL,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        kycLevel: user.kycLevel,
        isAgent: user.isAgent,
        emailVerified: user.emailVerified,
      },
    };
  }
}
