import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { PaginationQueryDto } from '@common/dto/api-response.dto';

@ApiTags('代理商')
@Controller('agent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('info')
  @ApiOperation({ summary: '代理商信息' })
  async getAgentInfo(@CurrentUser() user: User) {
    return this.agentService.getAgentInfo(user.id);
  }

  @Post('apply')
  @ApiOperation({ summary: '申请成为代理商' })
  async applyAgent(@CurrentUser() user: User) {
    return this.agentService.applyAgent(user.id);
  }

  @Get('referrals')
  @ApiOperation({ summary: '推荐列表' })
  @ApiQuery({ name: 'level', enum: ['1', '2', 'all'], required: false })
  async getReferrals(
    @CurrentUser() user: User,
    @Query() query: PaginationQueryDto,
    @Query('level') level?: string,
  ) {
    return this.agentService.getReferrals(user.id, query, level);
  }

  @Get('earnings')
  @ApiOperation({ summary: '收益明细' })
  @ApiQuery({ name: 'type', enum: ['card_open', 'monthly_fee', 'card_recharge', 'remittance', 'all'], required: false })
  async getEarnings(
    @CurrentUser() user: User,
    @Query() query: PaginationQueryDto,
    @Query('type') type?: string,
  ) {
    return this.agentService.getEarnings(user.id, query, type);
  }

  @Get('earnings/summary')
  @ApiOperation({ summary: '收益汇总' })
  async getEarningsSummary(@CurrentUser() user: User) {
    return this.agentService.getEarningsSummary(user.id);
  }

  @Get('invite')
  @ApiOperation({ summary: '邀请信息' })
  async getInviteInfo(@CurrentUser() user: User) {
    return this.agentService.getInviteInfo(user.id);
  }

  @Get('ranking')
  @ApiOperation({ summary: '排行榜' })
  async getRanking(@CurrentUser() user: User) {
    return this.agentService.getRanking(user.id);
  }

  @Get('policies')
  @ApiOperation({ summary: '可用代理政策列表' })
  async getPolicies() {
    return this.agentService.getPolicies();
  }

  @Get('earnings/by-provider')
  @ApiOperation({ summary: '按服务商分组的收益' })
  async getEarningsByProvider(@CurrentUser() user: User) {
    return this.agentService.getEarningsByProvider(user.id);
  }
}
