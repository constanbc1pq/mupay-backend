import { DataSource } from 'typeorm';
import { MessageTemplate } from '../entities/message-template.entity';

const templates = [
  {
    code: 'WELCOME',
    title: 'Welcome to MuPay!',
    content: `Dear {{nickname}},

Welcome to MuPay - Your Cross-border Digital Finance Platform!

Here you can:
• Deposit USDT for secure digital asset management
• Apply for virtual cards for global online payments
• Send low-cost remittances to 170+ countries

Complete identity verification to unlock higher limits. Start exploring now!

The MuPay Team`,
    type: 'welcome' as const,
    variables: JSON.stringify(['nickname']),
  },
  {
    code: 'DEPOSIT_SUCCESS',
    title: 'Deposit Successful',
    content: `Your deposit of {{amount}} USDT has been credited to your account.

Order Number: {{orderNo}}
Network: {{network}}

Your balance has been updated.`,
    type: 'transaction' as const,
    variables: JSON.stringify(['amount', 'orderNo', 'network']),
  },
  {
    code: 'TRANSFER_RECEIVED',
    title: 'Transfer Received',
    content: `You have received {{amount}} USDT from {{sender}}.

{{remark}}

Your balance has been updated.`,
    type: 'transaction' as const,
    variables: JSON.stringify(['amount', 'sender', 'remark']),
  },
  {
    code: 'TRANSFER_SENT',
    title: 'Transfer Sent',
    content: `You have sent {{amount}} USDT to {{recipient}}.

{{remark}}

Your balance has been updated.`,
    type: 'transaction' as const,
    variables: JSON.stringify(['amount', 'recipient', 'remark']),
  },
  {
    code: 'KYC_APPROVED',
    title: 'Identity Verification Approved',
    content: `Congratulations! Your {{level}} identity verification has been approved.

You now have access to higher transaction limits. Enjoy our services!`,
    type: 'system' as const,
    variables: JSON.stringify(['level']),
  },
  {
    code: 'KYC_REJECTED',
    title: 'Identity Verification Rejected',
    content: `Unfortunately, your identity verification was not approved.

Reason: {{reason}}

Please review the requirements and submit again.`,
    type: 'system' as const,
    variables: JSON.stringify(['reason']),
  },
  {
    code: 'CARD_APPLIED',
    title: 'Card Application Successful',
    content: `Your {{cardType}} virtual card application has been approved.

Card Number: {{cardNumber}}

You can now use your card for online payments.`,
    type: 'transaction' as const,
    variables: JSON.stringify(['cardType', 'cardNumber']),
  },
  {
    code: 'CARD_RECHARGED',
    title: 'Card Recharged',
    content: `Your card has been recharged with {{amount}} USDT.

Card: {{cardNumber}}
New Balance: {{balance}} USDT`,
    type: 'transaction' as const,
    variables: JSON.stringify(['amount', 'cardNumber', 'balance']),
  },
  {
    code: 'WITHDRAW_SUCCESS',
    title: 'Withdrawal Successful',
    content: `Your withdrawal of {{amount}} USDT has been processed.

Network: {{network}}
Address: {{address}}
TxHash: {{txHash}}`,
    type: 'transaction' as const,
    variables: JSON.stringify(['amount', 'network', 'address', 'txHash']),
  },
  {
    code: 'SYSTEM_NOTICE',
    title: '{{title}}',
    content: '{{content}}',
    type: 'system' as const,
    variables: JSON.stringify(['title', 'content']),
  },
];

export async function seedMessageTemplates(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(MessageTemplate);

  for (const template of templates) {
    const existing = await repo.findOneBy({ code: template.code });
    if (!existing) {
      await repo.save(repo.create(template));
      console.log(`Created message template: ${template.code}`);
    } else {
      console.log(`Message template already exists: ${template.code}`);
    }
  }

  console.log('Message template seed completed');
}
