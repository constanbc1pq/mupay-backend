import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@database/entities/user.entity';
import { MSG } from '@common/constants/messages';
import { RedisService } from '@config/redis.service';
import { EmailService } from '@config/email.service';
import { STORAGE_PROVIDER, StorageProvider } from '@services/storage/storage.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetPaymentPasswordDto, UpdatePaymentPasswordDto } from './dto/payment-password.dto';
import { UpdateLoginPasswordDto, ResetPaymentPasswordDto } from './dto/password.dto';
import { SendEmailBindCodeDto, BindEmailDto, SendEmailChangeCodeDto, ChangeEmailDto } from './dto/email.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private redisService: RedisService,
    private emailService: EmailService,
    @Inject(STORAGE_PROVIDER)
    private storageProvider: StorageProvider,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'phone', 'email', 'nickname', 'avatar', 'kycLevel', 'isAgent', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    // Check if payment password is set
    const fullUser = await this.userRepository.findOne({ where: { id: userId } });
    const hasPaymentPassword = !!fullUser?.paymentPassword;

    return {
      ...user,
      hasPaymentPassword,
    };
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (updateDto.nickname) {
      user.nickname = updateDto.nickname;
    }
    if (updateDto.avatar) {
      user.avatar = updateDto.avatar;
    }

    await this.userRepository.save(user);

    return { messageId: MSG.USER_UPDATE_SUCCESS };
  }

  async setPaymentPassword(userId: string, dto: SetPaymentPasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (user.paymentPassword) {
      throw new BadRequestException(MSG.USER_PAYMENT_PWD_ALREADY_SET);
    }

    user.paymentPassword = await bcrypt.hash(dto.password, 10);
    await this.userRepository.save(user);

    return { messageId: MSG.USER_PAYMENT_PWD_SET };
  }

  async verifyPaymentPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (!user.paymentPassword) {
      throw new BadRequestException(MSG.USER_PAYMENT_PWD_NOT_SET);
    }

    const isValid = await bcrypt.compare(password, user.paymentPassword);
    if (!isValid) {
      throw new BadRequestException(MSG.USER_PAYMENT_PWD_WRONG);
    }

    return true;
  }

  async updatePaymentPassword(userId: string, dto: UpdatePaymentPasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (!user.paymentPassword) {
      throw new BadRequestException(MSG.USER_PAYMENT_PWD_NOT_SET);
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.paymentPassword);
    if (!isOldPasswordValid) {
      throw new BadRequestException(MSG.USER_PAYMENT_PWD_WRONG);
    }

    user.paymentPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { messageId: MSG.USER_PAYMENT_PWD_UPDATED };
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: [{ username }, { phone: username }, { email: username }],
    });
  }

  // ==================== Avatar Upload ====================

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    // Upload to storage (avatar is resized in upload service)
    const result = await this.storageProvider.upload(file.buffer, file.originalname, {
      folder: `avatars/${userId}`,
    });

    // Update user avatar
    user.avatar = result.url;
    await this.userRepository.save(user);

    return {
      avatarUrl: result.url,
      messageId: MSG.USER_AVATAR_UPDATED,
    };
  }

  // ==================== Email Binding ====================

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendEmailBindCode(userId: string, dto: SendEmailBindCodeDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (user.emailVerified) {
      throw new BadRequestException(MSG.USER_EMAIL_ALREADY_BOUND);
    }

    // Check if email is already used by another user
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException(MSG.AUTH_EMAIL_EXISTS);
    }

    const code = this.generateCode();
    const redisKey = `email_bind:${userId}:${dto.email}`;

    await this.redisService.set(redisKey, code, 600); // 10 minutes
    await this.emailService.sendCode(dto.email, code, 'email_bind');

    return { messageId: MSG.USER_EMAIL_BIND_CODE_SENT };
  }

  async bindEmail(userId: string, dto: BindEmailDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (user.emailVerified) {
      throw new BadRequestException(MSG.USER_EMAIL_ALREADY_BOUND);
    }

    const redisKey = `email_bind:${userId}:${dto.email}`;
    const storedCode = await this.redisService.get(redisKey);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException(MSG.AUTH_CODE_INVALID);
    }

    // Check if email is already used by another user
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException(MSG.AUTH_EMAIL_EXISTS);
    }

    user.email = dto.email;
    user.emailVerified = true;
    await this.userRepository.save(user);

    await this.redisService.del(redisKey);

    return { messageId: MSG.USER_EMAIL_BOUND };
  }

  async sendEmailChangeCode(userId: string, dto: SendEmailChangeCodeDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (user.email === dto.newEmail) {
      throw new BadRequestException(MSG.USER_EMAIL_SAME);
    }

    // Check if new email is already used
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.newEmail },
    });
    if (existingUser) {
      throw new BadRequestException(MSG.AUTH_EMAIL_EXISTS);
    }

    const code = this.generateCode();
    const redisKey = `email_change:${userId}:${dto.newEmail}`;

    await this.redisService.set(redisKey, code, 600); // 10 minutes
    await this.emailService.sendCode(dto.newEmail, code, 'email_change');

    return { messageId: MSG.USER_EMAIL_CHANGE_CODE_SENT };
  }

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    const redisKey = `email_change:${userId}:${dto.newEmail}`;
    const storedCode = await this.redisService.get(redisKey);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException(MSG.AUTH_CODE_INVALID);
    }

    // Check if new email is already used
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.newEmail },
    });
    if (existingUser) {
      throw new BadRequestException(MSG.AUTH_EMAIL_EXISTS);
    }

    user.email = dto.newEmail;
    user.emailVerified = true;
    await this.userRepository.save(user);

    await this.redisService.del(redisKey);

    return { messageId: MSG.USER_EMAIL_CHANGED };
  }

  // ==================== Login Password ====================

  async updateLoginPassword(userId: string, dto: UpdateLoginPasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException(MSG.USER_PASSWORD_WRONG);
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { messageId: MSG.USER_PASSWORD_UPDATED };
  }

  // ==================== Payment Password Reset ====================

  async sendPaymentPasswordResetCode(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (!user.emailVerified) {
      throw new BadRequestException(MSG.AUTH_EMAIL_NOT_VERIFIED);
    }

    const code = this.generateCode();
    const redisKey = `payment_pwd_reset:${userId}`;

    await this.redisService.set(redisKey, code, 600); // 10 minutes
    await this.emailService.sendCode(user.email, code, 'payment_password_reset');

    return { messageId: MSG.AUTH_CODE_SENT };
  }

  async resetPaymentPassword(userId: string, dto: ResetPaymentPasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    const redisKey = `payment_pwd_reset:${userId}`;
    const storedCode = await this.redisService.get(redisKey);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException(MSG.AUTH_CODE_INVALID);
    }

    user.paymentPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    await this.redisService.del(redisKey);

    return { messageId: MSG.USER_PAYMENT_PWD_RESET };
  }
}
