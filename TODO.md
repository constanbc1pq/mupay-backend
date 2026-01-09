# MuPay Backend 开发计划

## Phase 1: 项目初始化与基础架构

- [x] NestJS 项目初始化
  - [x] 创建 NestJS 项目 (TypeScript)
  - [x] 配置 package.json 脚本
  - [x] 配置 tsconfig.json
  - [x] 配置 nest-cli.json

- [x] Docker 环境配置
  - [x] 创建 docker/docker-compose.yml
  - [x] 配置 MySQL 8.0 (端口 3315)
  - [x] 配置 Redis 7 (端口 6386)
  - [x] 创建 docker/init-db.sql 初始化脚本

- [x] 环境配置
  - [x] 创建 .env.development
  - [x] 创建 .env.production
  - [x] 配置 config/configuration.ts
  - [x] 配置 ConfigModule

- [x] TypeORM 配置
  - [x] 安装 TypeORM 及 MySQL 驱动
  - [x] 配置 database.config.ts
  - [x] 配置 dev 环境 synchronize: true
  - [x] 创建 database/entities/ 目录

- [x] Redis 配置
  - [x] 安装 ioredis
  - [x] 配置 redis.config.ts
  - [x] 创建 RedisModule
  - [x] 配置 dev 环境启动时 FLUSHDB

- [x] 公共模块
  - [x] 创建 common/filters/http-exception.filter.ts
  - [x] 创建 common/interceptors/transform.interceptor.ts
  - [x] 创建 common/dto/api-response.dto.ts
  - [x] 创建 common/decorators/current-user.decorator.ts

- [x] Swagger 配置
  - [x] 安装 @nestjs/swagger
  - [x] 配置 main.ts 启用 Swagger
  - [x] 配置 API 文档路径 /api/docs

## Phase 2: 认证模块

- [x] User 实体
  - [x] 创建 database/entities/user.entity.ts
  - [x] 字段: id/username/phone/email/password/nickname/avatar
  - [x] 字段: kycLevel/isAgent/paymentPassword/status
  - [x] 字段: googleId/createdAt/updatedAt

- [x] JWT 配置
  - [x] 安装 @nestjs/jwt @nestjs/passport passport-jwt
  - [x] 配置 JwtModule
  - [x] 创建 auth/strategies/jwt.strategy.ts
  - [x] 创建 common/guards/jwt-auth.guard.ts

- [x] 认证服务
  - [x] 创建 modules/auth/auth.module.ts
  - [x] 创建 modules/auth/auth.controller.ts
  - [x] 创建 modules/auth/auth.service.ts
  - [x] 创建 auth/dto/login.dto.ts
  - [x] 创建 auth/dto/register.dto.ts

- [x] 登录注册接口
  - [x] POST /api/auth/login 用户登录
  - [x] POST /api/auth/register 用户注册
  - [x] 实现 AccessToken 签发 (15min)
  - [x] 实现 RefreshToken 签发并存 Redis (7天)

- [x] Token 刷新与登出
  - [x] POST /api/auth/refresh 刷新 Token
  - [x] POST /api/auth/logout 登出 (删除 Redis RT)

- [x] Gmail OAuth
  - [x] 安装 passport-google-oauth20
  - [x] 创建 auth/strategies/google.strategy.ts
  - [x] POST /api/auth/google 处理 Google 授权码
  - [x] 实现用户自动注册/登录

- [x] 验证码功能
  - [x] POST /api/auth/verify-code/send 发送验证码
  - [x] POST /api/auth/verify-code/verify 校验验证码
  - [x] Redis 存储验证码 (5分钟过期)

## Phase 3: Admin 后台模块

- [x] AdminUser 实体
  - [x] 创建 database/entities/admin-user.entity.ts
  - [x] 字段: id/username/password/role/status
  - [x] 字段: lastLoginAt/createdAt/updatedAt

- [x] Admin 认证
  - [x] 创建 admin/strategies/admin-jwt.strategy.ts
  - [x] 创建 common/guards/admin-auth.guard.ts
  - [x] 配置独立的 JWT 签名密钥

- [x] Admin 模块
  - [x] 创建 modules/admin/admin.module.ts
  - [x] 创建 modules/admin/admin.controller.ts
  - [x] 创建 modules/admin/admin.service.ts

- [x] Admin 接口
  - [x] POST /api/admin/auth/login Admin 登录
  - [x] GET /api/admin/users 用户列表
  - [x] GET /api/admin/users/:id 用户详情
  - [x] PATCH /api/admin/users/:id/status 用户状态变更
  - [x] GET /api/admin/transactions 交易列表
  - [x] GET /api/admin/agents 代理商列表
  - [x] GET /api/admin/dashboard 统计面板

- [x] 种子数据
  - [x] 创建 database/seeds/admin.seed.ts
  - [x] 预置超级管理员账号

## Phase 4: 用户模块

- [x] 用户模块
  - [x] 创建 modules/user/user.module.ts
  - [x] 创建 modules/user/user.controller.ts
  - [x] 创建 modules/user/user.service.ts

- [x] 用户信息接口
  - [x] GET /api/user/profile 获取个人信息
  - [x] PATCH /api/user/profile 更新个人信息

- [x] 支付密码管理
  - [x] POST /api/user/payment-password 设置支付密码
  - [x] POST /api/user/payment-password/verify 验证支付密码
  - [x] PATCH /api/user/payment-password 修改支付密码
  - [x] 支付密码 bcrypt 加密存储

## Phase 5: 钱包模块

- [x] Wallet 实体
  - [x] 创建 database/entities/wallet.entity.ts
  - [x] 字段: id/userId/balance/frozenBalance
  - [x] 字段: depositAddressTRC20/depositAddressERC20/depositAddressBEP20
  - [x] 字段: createdAt/updatedAt

- [x] Transaction 实体
  - [x] 创建 database/entities/transaction.entity.ts
  - [x] 字段: id/userId/type/amount/fee/status
  - [x] 字段: remark/relatedId/createdAt/completedAt
  - [x] type 枚举: deposit/withdraw/transfer/remittance/topup/card_recharge

- [x] 钱包模块
  - [x] 创建 modules/wallet/wallet.module.ts
  - [x] 创建 modules/wallet/wallet.controller.ts
  - [x] 创建 modules/wallet/wallet.service.ts

- [x] 钱包接口
  - [x] GET /api/wallet/balance 获取余额
  - [x] GET /api/wallet/deposit-address 获取充值地址
  - [x] GET /api/wallet/transactions 交易记录列表
  - [x] GET /api/wallet/transactions/:id 交易详情

## Phase 6: 卡片模块

- [x] Card 实体
  - [x] 创建 database/entities/card.entity.ts
  - [x] 字段: id/userId/type/level/cardNumber/expiryDate/cvv
  - [x] 字段: balance/monthlyLimit/monthlyUsed/status
  - [x] 字段: bindings/createdAt/updatedAt
  - [x] cardNumber/cvv 使用 AES 加密存储

- [x] CardRecharge 实体
  - [x] 创建 database/entities/card-recharge.entity.ts
  - [x] 字段: id/userId/cardId/amount/fee/status
  - [x] 字段: createdAt/completedAt

- [x] 卡片模块
  - [x] 创建 modules/card/card.module.ts
  - [x] 创建 modules/card/card.controller.ts
  - [x] 创建 modules/card/card.service.ts

- [x] 卡片接口
  - [x] GET /api/card/list 我的卡片列表
  - [x] GET /api/card/types 卡片类型及费用
  - [x] POST /api/card/apply 申请新卡
  - [x] GET /api/card/:id 卡片详情
  - [x] GET /api/card/:id/cvv 获取 CVV (需验证支付密码)
  - [x] POST /api/card/:id/recharge 充值到卡
  - [x] POST /api/card/:id/freeze 冻结卡片
  - [x] POST /api/card/:id/unfreeze 解冻卡片
  - [x] POST /api/card/:id/upgrade 升级卡片等级

## Phase 7: 汇款模块

- [x] 配置数据实体
  - [x] 创建 database/entities/country.entity.ts
  - [x] 创建 database/entities/bank.entity.ts
  - [x] 创建 database/entities/exchange-rate.entity.ts

- [x] Remittance 实体
  - [x] 创建 database/entities/remittance.entity.ts
  - [x] 字段: id/userId/countryCode/bankCode/accountName/accountNumber
  - [x] 字段: amount/fee/rate/localAmount/status
  - [x] 字段: createdAt/completedAt

- [x] UsdtWithdraw 实体
  - [x] 创建 database/entities/usdt-withdraw.entity.ts
  - [x] 字段: id/userId/network/address/amount/fee/status
  - [x] 字段: txHash/createdAt/completedAt

- [x] 汇款模块
  - [x] 创建 modules/remittance/remittance.module.ts
  - [x] 创建 modules/remittance/remittance.controller.ts
  - [x] 创建 modules/remittance/remittance.service.ts

- [x] 配置数据接口
  - [x] GET /api/remittance/countries 支持的国家列表
  - [x] GET /api/remittance/banks 银行列表 (按国家)
  - [x] GET /api/remittance/rate 获取汇率
  - [x] GET /api/remittance/fee-calc 费用计算

- [x] 汇款接口
  - [x] POST /api/remittance/bank 发起银行汇款
  - [x] POST /api/remittance/usdt 发起 USDT 提取
  - [x] GET /api/remittance/orders 汇款订单列表
  - [x] GET /api/remittance/orders/:id 订单详情

- [x] 配置数据种子
  - [x] 创建 database/seeds/country.seed.ts
  - [x] 创建 database/seeds/bank.seed.ts
  - [x] 创建 database/seeds/exchange-rate.seed.ts

## Phase 8: 转账模块

- [x] Transfer 实体
  - [x] 创建 database/entities/transfer.entity.ts
  - [x] 字段: id/fromUserId/toUserId/amount/remark/status
  - [x] 字段: createdAt/completedAt

- [x] Contact 实体
  - [x] 创建 database/entities/contact.entity.ts
  - [x] 字段: id/userId/contactUserId/remark/createdAt

- [x] 转账模块
  - [x] 创建 modules/transfer/transfer.module.ts
  - [x] 创建 modules/transfer/transfer.controller.ts
  - [x] 创建 modules/transfer/transfer.service.ts

- [x] 转账接口
  - [x] GET /api/transfer/contacts 常用联系人
  - [x] POST /api/transfer/search-user 搜索用户
  - [x] POST /api/transfer 发起转账
  - [x] GET /api/transfer/records 转账记录

## Phase 9: 话费充值模块

- [x] MobileOperator 实体
  - [x] 创建 database/entities/mobile-operator.entity.ts
  - [x] 字段: id/code/name/countryCode/status

- [x] TopUp 实体
  - [x] 创建 database/entities/topup.entity.ts
  - [x] 字段: id/userId/operatorCode/phoneNumber/amount/fee/status
  - [x] 字段: createdAt/completedAt

- [x] 话费充值模块
  - [x] 创建 modules/topup/topup.module.ts
  - [x] 创建 modules/topup/topup.controller.ts
  - [x] 创建 modules/topup/topup.service.ts

- [x] 话费充值接口
  - [x] GET /api/topup/operators 运营商列表
  - [x] GET /api/topup/packages 充值套餐
  - [x] POST /api/topup 发起充值
  - [x] GET /api/topup/records 充值记录

- [x] 运营商种子数据
  - [x] 创建 database/seeds/mobile-operator.seed.ts

## Phase 10: 代理商模块

- [x] Agent 实体
  - [x] 创建 database/entities/agent.entity.ts
  - [x] 字段: id/userId/inviteCode/totalEarnings/status
  - [x] 字段: applyTime/createdAt/updatedAt

- [x] Referral 实体
  - [x] 创建 database/entities/referral.entity.ts
  - [x] 字段: id/agentId/referredUserId/level/createdAt
  - [x] level: 1 (直接推荐) / 2 (二级推荐)

- [x] AgentEarning 实体
  - [x] 创建 database/entities/agent-earning.entity.ts
  - [x] 字段: id/agentId/type/amount/fromUserId/level
  - [x] 字段: relatedOrderId/createdAt
  - [x] type 枚举: card_open/monthly_fee/card_recharge/remittance

- [x] 代理商模块
  - [x] 创建 modules/agent/agent.module.ts
  - [x] 创建 modules/agent/agent.controller.ts
  - [x] 创建 modules/agent/agent.service.ts

- [x] 代理商接口
  - [x] GET /api/agent/info 代理商信息
  - [x] POST /api/agent/apply 申请成为代理商
  - [x] GET /api/agent/referrals 推荐列表
  - [x] GET /api/agent/earnings 收益明细
  - [x] GET /api/agent/earnings/summary 收益汇总
  - [x] GET /api/agent/invite 邀请信息
  - [x] GET /api/agent/ranking 排行榜

- [x] 佣金计算服务
  - [x] 创建 agent/services/commission.service.ts
  - [x] 实现一级佣金计算
  - [x] 实现二级佣金计算 (10%)

## Phase 11: 消息国际化

- [x] 消息常量定义
  - [x] 创建 common/constants/messages.ts
  - [x] 定义通用消息 MSG_0xxx
  - [x] 定义认证消息 MSG_1xxx
  - [x] 定义用户消息 MSG_2xxx
  - [x] 定义钱包消息 MSG_3xxx
  - [x] 定义卡片消息 MSG_4xxx
  - [x] 定义汇款消息 MSG_5xxx
  - [x] 定义转账消息 MSG_6xxx
  - [x] 定义充值消息 MSG_7xxx
  - [x] 定义代理消息 MSG_8xxx

- [x] 响应结构改造
  - [x] 修改 ApiResponse.dto 添加 messageId 字段
  - [x] 修改 HttpExceptionFilter 支持 messageId

- [x] 各模块消息替换
  - [x] auth 模块消息替换
  - [x] admin 模块消息替换
  - [x] user 模块消息替换
  - [x] wallet 模块消息替换
  - [x] card 模块消息替换
  - [x] remittance 模块消息替换
  - [x] transfer 模块消息替换
  - [x] topup 模块消息替换
  - [x] agent 模块消息替换
