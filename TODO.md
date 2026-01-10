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

## Phase 12: 加密货币充值系统 (测试环境 HD Wallet)

> 说明: 测试阶段使用 HD Wallet 为每用户派生独立地址，生产环境将接入第三方托管服务 (Fireblocks/Circle)

- [x] HD 钱包服务
  - [x] 安装 ethers.js tronweb 依赖
  - [x] 创建 services/blockchain/blockchain.module.ts
  - [x] 创建 services/blockchain/hd-wallet.service.ts
  - [x] 配置测试用主种子 (环境变量 HD_WALLET_MNEMONIC)
  - [x] 实现 ERC20/BEP20 地址派生 (BIP44 m/44'/60'/0'/0/index)
  - [x] 实现 TRC20 地址派生 (BIP44 m/44'/195'/0'/0/index)

- [x] 充值地址管理
  - [x] 创建 database/entities/deposit-address.entity.ts
  - [x] 字段: id/userId/network/address/derivationIndex
  - [x] 字段: isActive/totalReceived/createdAt
  - [x] 改造 wallet.service.ts 调用 HD 钱包派生真实地址

- [x] 充值订单实体
  - [x] 创建 database/entities/deposit-order.entity.ts
  - [x] 字段: id/userId/orderNo/method (CRYPTO/CARD/PAYPAL)
  - [x] 字段: network/txHash/fromAddress/toAddress/blockNumber/confirmations
  - [x] 字段: amount/fee/netAmount/currency/status
  - [x] 字段: createdAt/confirmedAt/completedAt

- [x] 区块链监控服务 (轮询模式)
  - [x] 创建 services/blockchain/monitor.service.ts
  - [x] 配置 RPC 节点地址 (Infura/Alchemy/TronGrid)
  - [x] 实现 ERC20 USDT 余额轮询检查
  - [x] 实现 BEP20 USDT 余额轮询检查
  - [x] 实现 TRC20 USDT 余额轮询检查
  - [x] 实现新充值检测逻辑

- [x] 定时任务配置
  - [x] 安装 @nestjs/schedule 依赖
  - [x] 创建 jobs/deposit.job.ts 充值检测与确认任务
  - [x] 实现区块确认数检查 (TRC20:20/ERC20:12/BEP20:15)

- [x] 充值到账处理
  - [x] 实现充值订单状态更新
  - [x] 实现用户余额增加 (事务处理)
  - [x] 实现充值交易记录创建

- [x] 测试用资金归集 (简化版)
  - [x] 创建 services/blockchain/sweep.service.ts
  - [x] 实现单地址归集功能
  - [ ] 创建 Admin 手动归集接口 POST /api/admin/sweep

## Phase 13: 银行卡充值系统 (Stripe)

> **跳过** - 正式环境将使用 Cobo/FireBlock 托管服务，测试阶段仅保留链上充值

## Phase 14: PayPal 充值系统

> **跳过** - 正式环境将使用 Cobo/FireBlock 托管服务，测试阶段仅保留链上充值

## Phase 15: 充值模块统一管理

- [x] 充值模块重构
  - [x] 创建 modules/deposit/deposit.module.ts
  - [x] 创建 modules/deposit/deposit.controller.ts
  - [x] 创建 modules/deposit/deposit.service.ts
  - [x] 链上充值 (CRYPTO) 功能

- [x] 统一充值接口
  - [x] GET /api/deposit/orders 充值订单列表
  - [x] GET /api/deposit/orders/:id 订单详情
  - [x] GET /api/deposit/methods 可用充值方式及配置

- [x] 充值限额配置
  - [x] 创建 database/entities/deposit-limit.entity.ts
  - [x] 字段: method/network/scope/minAmount/maxAmount/dailyLimit/weeklyLimit/monthlyLimit
  - [x] 创建 modules/deposit/deposit-limit.service.ts 限额管理服务
  - [x] GET /api/deposit/limits 获取用户限额信息
  - [ ] Admin 接口: 限额配置管理

- [x] 订单过期处理
  - [x] 更新 jobs/deposit.job.ts 添加过期处理任务
  - [x] 实现待支付订单超时取消 (30分钟)
  - [x] POST /api/deposit/orders/:id/cancel 取消订单接口
  - [ ] 实现异常订单告警

## Phase 16: 充值通知与审计

- [x] 充值通知服务
  - [x] 创建 services/notification/deposit-notification.service.ts
  - [x] 创建 database/entities/user-notification.entity.ts 站内信实体
  - [x] 实现充值成功通知 (站内信)
  - [x] 实现充值成功通知 (邮件)
  - [x] 实现充值失败通知
  - [x] 用户通知接口
    - [x] GET /api/user/notifications 通知列表
    - [x] GET /api/user/notifications/unread-count 未读数量
    - [x] POST /api/user/notifications/:id/read 标记已读
    - [x] POST /api/user/notifications/read-all 全部已读

- [x] 审计日志
  - [x] 创建 database/entities/deposit-audit-log.entity.ts
  - [x] 创建 services/notification/deposit-audit.service.ts
  - [x] 记录所有充值状态变更
  - [x] 记录归集操作日志
  - [x] 集成到 deposit.service.ts

- [x] Admin 充值管理
  - [x] 创建 modules/admin/admin-deposit.controller.ts
  - [x] 创建 modules/admin/admin-deposit.service.ts
  - [x] GET /api/admin/deposits 充值订单列表
  - [x] GET /api/admin/deposits/:id 订单详情
  - [x] POST /api/admin/deposits/:id/manual-confirm 人工确认
  - [x] GET /api/admin/deposits/stats 充值统计
  - [x] GET /api/admin/hot-wallet/balance 热钱包余额
  - [x] GET /api/admin/deposits/audit-logs 审计日志列表
  - [x] GET /api/admin/deposits/addresses 充值地址列表

## Phase 17: 文件上传服务

> 说明: 测试阶段上传至服务器本地存储，预留 AWS S3 接口

- [x] 文件存储服务
  - [x] 创建 services/storage/storage.module.ts
  - [x] 创建 services/storage/local-storage.service.ts 本地存储实现
  - [x] 创建 services/storage/s3-storage.service.ts AWS S3 实现 (预留)
  - [x] 创建 StorageProvider 接口抽象
  - [x] 配置 STORAGE_PROVIDER 环境变量切换

- [x] 文件上传接口
  - [x] POST /api/upload/image 通用图片上传
  - [x] POST /api/upload/avatar 头像上传 (含裁剪/压缩)
  - [x] POST /api/upload/kyc 证件照上传 (加密存储)
  - [x] 文件大小限制 (图片 5MB)
  - [x] 文件类型校验 (jpg/png/webp)

- [x] 静态文件服务
  - [x] 配置 /uploads 静态文件访问路径
  - [x] 配置文件访问权限控制

## Phase 18: 个人资料扩展

- [x] 用户实体扩展
  - [x] User 实体添加 avatar 字段
  - [x] User 实体添加 emailVerified 字段

- [x] 头像上传接口
  - [x] POST /api/upload/avatar 上传头像
  - [x] 自动压缩至 200x200
  - [x] 返回头像 URL

- [x] 邮箱绑定/更换
  - [x] POST /api/user/email/bindCode 发送绑定验证码
  - [x] POST /api/user/email/bind 确认绑定邮箱
  - [x] POST /api/user/email/changeCode 发送更换验证码 (发送到新邮箱)
  - [x] POST /api/user/email/change 确认更换邮箱
  - [x] 测试阶段: 验证码在控制台输出

- [x] 邮件服务
  - [x] 创建 config/email.module.ts
  - [x] 创建 config/email.service.ts 邮件服务实现
  - [x] 测试阶段控制台输出验证码

## Phase 19: KYC 身份认证模块

> 说明: 测试阶段 OCR/人脸识别直接通过，预留 AWS Rekognition 接口

- [x] KYC 实体
  - [x] 创建 database/entities/kyc-record.entity.ts
  - [x] 字段: id/userId/level/realName/idType/idNumber
  - [x] 字段: idFrontUrl/idBackUrl/holdingIdUrl/faceVerified
  - [x] 字段: status/rejectReason/reviewedBy/reviewedAt
  - [x] 字段: createdAt/updatedAt

- [x] KYC 模块
  - [x] 创建 modules/kyc/kyc.module.ts
  - [x] 创建 modules/kyc/kyc.controller.ts
  - [x] 创建 modules/kyc/kyc.service.ts

- [x] KYC 接口
  - [x] GET /api/kyc/status 获取认证状态
  - [x] POST /api/kyc/basic 提交初级认证 (姓名+证件号)
  - [x] POST /api/kyc/advanced/upload 上传证件照片
  - [x] POST /api/kyc/advanced/face 人脸识别验证
  - [x] GET /api/kyc/records 认证记录

- [x] OCR 服务 (预留)
  - [x] 测试环境直接通过 (在 kyc.service.ts 中实现)
  - [ ] 创建 services/ocr/aws-ocr.service.ts AWS Textract 实现 (生产环境)

- [x] 人脸识别服务 (预留)
  - [x] 测试环境直接通过 (在 kyc.service.ts 中实现)
  - [ ] 创建 services/face/aws-face.service.ts AWS Rekognition 实现 (生产环境)

- [x] KYC 限额关联
  - [x] 更新 deposit-limit.service.ts 根据 KYC 等级返回限额
  - [x] Level 0: 单笔 $100, 日 $100
  - [x] Level 1: 单笔 $1,000, 日 $5,000
  - [x] Level 2: 单笔 $10,000, 日 $50,000

- [x] Admin KYC 审核
  - [x] GET /api/admin/kyc/pending 待审核列表
  - [x] GET /api/admin/kyc/:id 认证详情
  - [x] POST /api/admin/kyc/:id/approve 通过认证
  - [x] POST /api/admin/kyc/:id/reject 拒绝认证

## Phase 20: 安全中心扩展

- [x] 登录密码修改
  - [x] PATCH /api/user/password 修改登录密码
  - [x] 验证原密码
  - [x] 密码强度校验

- [x] 支付密码重置
  - [x] POST /api/user/payment-password/resetCode 发送重置验证码
  - [x] POST /api/user/payment-password/reset 重置支付密码 (邮箱验证)

- [x] 双因素认证 (2FA)
  - [x] User 实体添加 twoFactorSecret/twoFactorEnabled 字段
  - [x] 使用 crypto 模块实现 TOTP (无需 otplib)
  - [x] POST /api/security/2fa/generate 生成 2FA 密钥和二维码
  - [x] POST /api/security/2fa/enable 启用 2FA (需验证 TOTP)
  - [x] POST /api/security/2fa/disable 禁用 2FA (需验证 TOTP)
  - [x] POST /api/security/2fa/verify 验证 TOTP 码
  - [x] 登录流程集成 2FA 验证

- [x] 设备管理实体
  - [x] 创建 database/entities/user-device.entity.ts
  - [x] 字段: id/userId/deviceId/deviceName/deviceType/os
  - [x] 字段: ip/location/lastActiveAt/createdAt

- [x] 设备管理接口
  - [x] GET /api/security/devices 获取设备列表
  - [x] DELETE /api/security/devices/:id 移除设备
  - [x] 登录时自动记录设备信息

- [x] 登录历史实体
  - [x] 创建 database/entities/login-history.entity.ts
  - [x] 字段: id/userId/ip/device/location/status/createdAt

- [x] 登录历史接口
  - [x] GET /api/security/login-history 登录历史列表
  - [x] 登录成功/失败时记录

## Phase 21: 帮助与反馈模块

- [x] FAQ 实体
  - [x] 创建 database/entities/faq.entity.ts (含 FaqCategory 和 FaqItem)
  - [x] 字段: id/categoryId/question/answer/sortOrder/viewCount

- [x] 反馈实体
  - [x] 创建 database/entities/feedback.entity.ts
  - [x] 字段: id/userId/type/content/images/status/reply/createdAt

- [x] 帮助模块
  - [x] 创建 modules/support/support.module.ts
  - [x] 创建 modules/support/support.controller.ts
  - [x] 创建 modules/support/support.service.ts

- [x] 帮助接口
  - [x] GET /api/support/faq/categories FAQ 分类列表
  - [x] GET /api/support/faq FAQ 列表
  - [x] GET /api/support/faq/:id FAQ 详情
  - [x] POST /api/support/feedback 提交反馈
  - [x] GET /api/support/feedback 我的反馈列表

- [x] FAQ 种子数据
  - [x] 创建 database/seeds/faq.seed.ts
  - [x] 添加常见问题 (充值/汇款/卡片/安全/KYC)

- [x] Admin 反馈管理
  - [x] GET /api/admin/feedback 反馈列表
  - [x] GET /api/admin/feedback/:id 反馈详情
  - [x] POST /api/admin/feedback/:id/reply 回复反馈

## Phase 22: 账户注销

- [x] 注销请求实体
  - [x] 创建 database/entities/account-deletion.entity.ts
  - [x] 字段: id/userId/status/reason/requestedAt/scheduledAt/cancelledAt

- [x] 注销接口
  - [x] GET /api/account/delete/check 检查注销条件
  - [x] POST /api/account/delete/request 申请注销
  - [x] POST /api/account/delete/cancel 撤销注销
  - [x] GET /api/account/delete/status 注销状态

- [x] 注销条件检查
  - [x] 余额为零
  - [x] 无进行中的订单 (冻结资金)
  - [x] 无活动中的卡片

- [x] 注销定时任务
  - [x] 在 account.service.ts 中实现 @Cron 任务
  - [x] 7天冷静期后执行删除
  - [x] 用户数据匿名化处理
