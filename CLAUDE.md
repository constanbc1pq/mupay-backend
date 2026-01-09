# CLAUDE.md - MuPay Backend 开发规范

> 通用规则见项目根目录 `/mupay/CLAUDE.md`

## 项目规则

- 后端代码修改完成后，输出启动语句，不用执行，等待用户手动执行
- dev 环境启动时自动同步数据库结构和清除 Redis

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | NestJS 10.x |
| 语言 | TypeScript 5.x |
| ORM | TypeORM 0.3.x |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis 7.x |
| 认证 | Passport + JWT |
| OAuth | Google OAuth 2.0 |
| 文档 | Swagger/OpenAPI |

---

## 服务配置

```
服务端口: 5781
MySQL: localhost:3315
Redis: localhost:6386
```

---

## 目录结构

```
mupay-backend/
├── src/
│   ├── main.ts                    # 入口文件
│   ├── app.module.ts              # 根模块
│   ├── config/                    # 配置模块
│   ├── common/                    # 公共模块
│   │   ├── decorators/            # 自定义装饰器
│   │   ├── filters/               # 异常过滤器
│   │   ├── guards/                # 守卫
│   │   ├── interceptors/          # 拦截器
│   │   └── dto/                   # 公共 DTO
│   ├── modules/                   # 业务模块
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── user/
│   │   ├── wallet/
│   │   ├── card/
│   │   ├── remittance/
│   │   ├── transfer/
│   │   ├── topup/
│   │   ├── agent/
│   │   └── config-data/
│   └── database/
│       ├── entities/              # 实体定义
│       └── seeds/                 # 种子数据
├── docker/
│   └── docker-compose.yml
├── .env.development
└── .env.production
```

---

## 命名约定

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `wallet.service.ts` |
| 模块文件 | kebab-case + 类型后缀 | `wallet.module.ts` |
| 控制器 | kebab-case + controller | `wallet.controller.ts` |
| 服务 | kebab-case + service | `wallet.service.ts` |
| 实体 | kebab-case + entity | `user.entity.ts` |
| DTO | kebab-case + dto | `create-user.dto.ts` |
| Guard | kebab-case + guard | `jwt-auth.guard.ts` |

---

## 模块开发规范

### 标准模块结构

```
modules/wallet/
├── wallet.module.ts
├── wallet.controller.ts
├── wallet.service.ts
├── dto/
│   ├── index.ts
│   ├── get-balance.dto.ts
│   └── create-transaction.dto.ts
└── entities/
    └── wallet.entity.ts (或放 database/entities/)
```

### Controller 示例

```typescript
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiTags('钱包')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: '获取余额' })
  async getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user.id);
  }
}
```

### Service 示例

```typescript
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
  ) {}

  async getBalance(userId: string): Promise<WalletBalanceDto> {
    const wallet = await this.walletRepo.findOneBy({ userId });
    return { balance: wallet.balance, frozenBalance: wallet.frozenBalance };
  }
}
```

---

## 实体定义规范

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 错误响应

```json
{
  "code": 10001,
  "message": "用户不存在",
  "data": null
}
```

### 错误码规范

| 范围 | 模块 |
|------|------|
| 10xxx | 认证相关 |
| 20xxx | 用户相关 |
| 30xxx | 钱包相关 |
| 40xxx | 卡片相关 |
| 50xxx | 汇款相关 |
| 60xxx | 转账相关 |
| 70xxx | 代理商相关 |

---

## 常用命令

```bash
# Docker 环境
cd docker && docker-compose up -d    # 启动 MySQL + Redis

# 开发
yarn start:dev                       # 启动开发服务器

# 构建
yarn build                           # 构建生产版本
yarn start:prod                      # 启动生产服务

# 类型检查
yarn lint                            # ESLint 检查
```

---

## Commit Scope

```
scope: auth|admin|user|wallet|card|remittance|transfer|topup|agent|common|config
```

示例:
- `feat(wallet): add balance query endpoint`
- `fix(auth): jwt refresh token validation`
- `refactor(common): extract response interceptor`
