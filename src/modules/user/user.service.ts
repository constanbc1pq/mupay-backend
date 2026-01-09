import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@database/entities/user.entity';
import { MSG } from '@common/constants/messages';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetPaymentPasswordDto, UpdatePaymentPasswordDto } from './dto/payment-password.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
}
