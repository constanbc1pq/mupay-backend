# MuPay 后端服务设计方案

## 一、技术架构

### 1.1 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | NestJS 10.x | 企业级 Node.js 框架 |
| 语言 | TypeScript 5.x | 类型安全 |
| ORM | TypeORM 0.3.x | 数据库实体映射 |
| 数据库 | MySQL 8.0 | 主数据存储 |
| 缓存 | Redis 7.x | 会话/验证码/热数据缓存 |
| 认证 | Passport + JWT | 双 Token 机制 |
| OAuth | Google OAuth 2.0 | Gmail 授权登录 |
| 容器化 | Docker Compose | MySQL + Redis |
| 文档 | Swagger/OpenAPI | 接口文档自动生成 |

### 1.2 服务配置

```
服务端口: 5781
MySQL: localhost:3315
Redis: localhost:6386
JWT Access Token 有效期: 15分钟
JWT Refresh Token 有效期: 7天
```

---

## 二、项目结构

```
mupay-backend/
├── src/
│   ├── main.ts                    # 入口文件
│   ├── app.module.ts              # 根模块
│   │
│   ├── config/                    # 配置模块
│   │   ├── configuration.ts       # 环境配置
│   │   ├── database.config.ts     # 数据库配置
│   │   └── redis.config.ts        # Redis 配置
│   │
│   ├── common/                    # 公共模块
│   │   ├── decorators/            # 自定义装饰器
│   │   ├── filters/               # 异常过滤器
│   │   ├── guards/                # 守卫
│   │   ├── interceptors/          # 拦截器
│   │   ├── pipes/                 # 管道
│   │   └── dto/                   # 公共 DTO
│   │
│   ├── modules/
│   │   ├── auth/                  # 认证模块
│   │   ├── admin/                 # Admin 后台模块
│   │   ├── user/                  # 用户模块
│   │   ├── wallet/                # 钱包模块
│   │   ├── card/                  # 借记卡模块
│   │   ├── remittance/            # 汇款模块
│   │   ├── transfer/              # 转账模块
│   │   ├── topup/                 # 话费充值模块
│   │   ├── agent/                 # 代理商模块
│   │   └── config-data/           # 配置数据模块 (国家/银行/汇率)
│   │
│   └── database/
│       ├── entities/              # 所有实体
│       ├── migrations/            # 数据库迁移
│       └── seeds/                 # 种子数据
│
├── docker/
│   ├── docker-compose.yml         # Docker 编排
│   └── init-db.sql                # 数据库初始化
│
├── test/                          # 测试文件
├── .env.development               # 开发环境变量
├── .env.production                # 生产环境变量
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 三、数据库实体设计

### 3.1 核心实体关系图

```
┌──────────────────┐     ┌──────────────────┐
│      User        │────<│   Transaction    │
└──────────────────┘     └──────────────────┘
        │
        │ 1:N
        ▼
┌──────────────────┐     ┌──────────────────┐
│      Card        │     │     Wallet       │
└──────────────────┘     └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│      Agent       │────<│  AgentEarning    │
└──────────────────┘     └──────────────────┘
        │
        │ 1:N
        ▼
┌──────────────────┐
│    Referral      │
└──────────────────┘

┌──────────────────┐
│   AdminUser      │  (独立后台用户表)
└──────────────────┘
```

### 3.2 实体清单

| 实体 | 说明 |
|------|------|
| **User** | 用户信息 (手机/邮箱/昵称/KYC等级/代理商状态) |
| **Wallet** | 钱包 (余额/冻结金额/充值地址) |
| **Transaction** | 交易记录 (充值/汇款/转账/消费/充值到卡) |
| **Card** | 虚拟借记卡 (卡号/有效期/CVV/余额/状态) |
| **CardRecharge** | 卡充值记录 |
| **Remittance** | 银行汇款订单 |
| **UsdtWithdraw** | USDT 提取订单 |
| **Transfer** | 内部转账记录 |
| **TopUp** | 话费充值订单 |
| **Agent** | 代理商信息 |
| **AgentEarning** | 代理商收益明细 |
| **Referral** | 推荐关系 (一级/二级) |
| **AdminUser** | 后台管理员 |
| **Country** | 支持的国家 |
| **Bank** | 银行列表 |
| **ExchangeRate** | 实时汇率 |
| **MobileOperator** | 手机运营商 |

---

## 四、认证系统设计

### 4.1 用户认证 (双 Token 机制)

```
┌─────────────────────────────────────────────────┐
│                   JWT 认证流程                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  登录成功 → 签发 AccessToken (15min)            │
│          → 签发 RefreshToken (7天, 存Redis)     │
│                                                 │
│  请求验证 → Header: Authorization: Bearer <AT>  │
│                                                 │
│  AT 过期  → 用 RT 换取新 AT+RT                  │
│                                                 │
│  登出    → 删除 Redis 中的 RT                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.2 Gmail OAuth 登录流程

```
1. 前端引导用户访问 Google 授权页
2. 用户授权后，Google 回调携带 code
3. 后端用 code 换取 Google access_token
4. 用 access_token 获取用户 Gmail 信息
5. 查询/创建用户，签发 JWT
```

### 4.3 Admin 后台认证

- 独立的 AdminUser 表
- 独立的 JWT 签名密钥
- 独立的 Guard (`AdminAuthGuard`)
- 预置超级管理员账号 (通过种子数据)

---

## 五、API 端点设计

### 5.1 认证模块 (`/api/auth`)

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/login` | 用户名/手机号登录 |
| POST | `/register` | 注册 |
| POST | `/google` | Gmail OAuth 登录 |
| POST | `/refresh` | 刷新 Token |
| POST | `/logout` | 登出 |
| POST | `/verify-code/send` | 发送验证码 |
| POST | `/verify-code/verify` | 验证码校验 |
| POST | `/forgot-password` | 忘记密码 |

### 5.2 Admin 模块 (`/api/admin`)

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/auth/login` | Admin 登录 |
| GET | `/users` | 用户列表 |
| GET | `/users/:id` | 用户详情 |
| PATCH | `/users/:id/status` | 用户状态变更 |
| GET | `/transactions` | 交易列表 |
| GET | `/agents` | 代理商列表 |
| GET | `/dashboard` | 统计面板 |

### 5.3 用户模块 (`/api/user`)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/profile` | 获取个人信息 |
| PATCH | `/profile` | 更新个人信息 |
| POST | `/payment-password` | 设置支付密码 |
| POST | `/payment-password/verify` | 验证支付密码 |
| PATCH | `/payment-password` | 修改支付密码 |

### 5.4 钱包模块 (`/api/wallet`)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/balance` | 获取余额 |
| GET | `/deposit-address` | 获取充值地址 (按网络类型) |
| GET | `/transactions` | 交易记录列表 |
| GET | `/transactions/:id` | 交易详情 |

### 5.5 汇款模块 (`/api/remittance`)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/countries` | 支持的国家列表 |
| GET | `/banks` | 银行列表 (按国家) |
| GET | `/rate` | 获取汇率 |
| GET | `/fee-calc` | 费用计算 |
| POST | `/bank` | 发起银行汇款 |
| POST | `/usdt` | 发起 USDT 提取 |
| GET | `/orders` | 汇款订单列表 |
| GET | `/orders/:id` | 订单详情 |

### 5.6 卡片模块 (`/api/card`)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/list` | 我的卡片列表 |
| GET | `/types` | 卡片类型及费用 |
| POST | `/apply` | 申请新卡 |
| GET | `/:id` | 卡片详情 |
| GET | `/:id/cvv` | 获取 CVV (需支付密码验证) |
| POST | `/:id/recharge` | 充值到卡 |
| POST | `/:id/freeze` | 冻结卡片 |
| POST | `/:id/unfreeze` | 解冻卡片 |
| POST | `/:id/upgrade` | 升级卡片等级 |

### 5.7 转账模块 (`/api/transfer`)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/contacts` | 常用联系人 |
| POST | `/search-user` | 搜索用户 (MuPay ID) |
| POST | `/` | 发起转账 |
| GET | `/records` | 转账记录 |

### 5.8 话费充值模块 (`/api/topup`)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/operators` | 运营商列表 |
| GET | `/packages` | 充值套餐 |
| POST | `/` | 发起充值 |
| GET | `/records` | 充值记录 |

### 5.9 代理商模块 (`/api/agent`)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/info` | 代理商信息 |
| POST | `/apply` | 申请成为代理商 |
| GET | `/referrals` | 推荐列表 (一级/二级) |
| GET | `/earnings` | 收益明细 |
| GET | `/earnings/summary` | 收益汇总 |
| GET | `/invite` | 邀请信息 (邀请码/链接) |
| GET | `/ranking` | 排行榜 |

---

## 六、Redis 缓存策略

| Key 模式 | 用途 | TTL |
|----------|------|-----|
| `rt:{userId}` | Refresh Token | 7天 |
| `verify:{phone/email}` | 验证码 | 5分钟 |
| `rate:{currency}` | 汇率缓存 | 5分钟 |
| `user:{userId}` | 用户信息缓存 | 10分钟 |
| `lock:withdraw:{userId}` | 提现防重锁 | 30秒 |
| `lock:transfer:{txId}` | 转账幂等锁 | 1分钟 |

---

## 七、安全设计

### 7.1 支付密码验证层级

```
Level 1 (登录态): 查看余额、交易记录
Level 2 (支付密码): 转账、汇款、充值到卡、提取USDT
Level 3 (支付密码 + 验证码): 大额交易(>5000U)、修改支付密码
```

### 7.2 安全措施

- 支付密码 bcrypt 加密存储
- 敏感数据 AES 加密 (卡号、CVV)
- 接口限流 (使用 `@nestjs/throttler`)
- SQL 注入防护 (TypeORM 参数化查询)
- XSS 防护 (helmet 中间件)
- 交易防重放 (Redis 幂等锁)

---

## 八、开发环境配置

### 8.1 Docker Compose

```yaml
# docker/docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3315:3306"
    environment:
      MYSQL_ROOT_PASSWORD: mupay_root_123
      MYSQL_DATABASE: mupay
      MYSQL_USER: mupay
      MYSQL_PASSWORD: mupay_123
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6386:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

### 8.2 dev 环境自动同步

在 `app.module.ts` 中配置：
- TypeORM `synchronize: true` (仅 dev 环境)
- 启动时执行 Redis `FLUSHDB` (仅 dev 环境)

---

*文档版本：v1.0*
*更新日期：2026年1月9日*
