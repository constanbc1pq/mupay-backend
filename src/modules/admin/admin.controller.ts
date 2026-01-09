import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '@common/guards/admin-auth.guard';
import { AdminLoginDto } from './dto/admin-login.dto';
import { PaginationQueryDto } from '@common/dto/api-response.dto';

@ApiTags('Admin后台')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin登录' })
  async login(@Body() loginDto: AdminLoginDto) {
    return this.adminService.login(loginDto);
  }

  @Get('users')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户列表' })
  async getUsers(@Query() query: PaginationQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户详情' })
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/status')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户状态变更' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Get('transactions')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '交易列表' })
  async getTransactions(@Query() query: PaginationQueryDto) {
    return this.adminService.getTransactions(query);
  }

  @Get('agents')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '代理商列表' })
  async getAgents(@Query() query: PaginationQueryDto) {
    return this.adminService.getAgents(query);
  }

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '统计面板' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }
}
