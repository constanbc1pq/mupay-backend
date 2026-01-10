import { DataSource } from 'typeorm';
import { FaqCategory, FaqItem } from '../entities/faq.entity';

export async function seedFaq(dataSource: DataSource) {
  const categoryRepo = dataSource.getRepository(FaqCategory);
  const faqRepo = dataSource.getRepository(FaqItem);

  // Check if already seeded
  const existingCount = await categoryRepo.count();
  if (existingCount > 0) {
    console.log('FAQ data already exists, skipping seed');
    return;
  }

  // Create categories
  const categories = [
    { name: 'Deposit & Withdrawal', nameKey: 'faq.category.deposit', icon: 'wallet', sortOrder: 1 },
    { name: 'Virtual Card', nameKey: 'faq.category.card', icon: 'credit-card', sortOrder: 2 },
    { name: 'Remittance', nameKey: 'faq.category.remittance', icon: 'send', sortOrder: 3 },
    { name: 'Account Security', nameKey: 'faq.category.security', icon: 'shield', sortOrder: 4 },
    { name: 'KYC Verification', nameKey: 'faq.category.kyc', icon: 'user-check', sortOrder: 5 },
  ];

  const savedCategories = await categoryRepo.save(categories);

  // Create FAQ items
  const faqItems = [
    // Deposit & Withdrawal
    {
      categoryId: savedCategories[0].id,
      question: 'How do I deposit USDT?',
      questionKey: 'faq.deposit.how',
      answer: 'Go to Deposit > Crypto, select your preferred network (TRC20, ERC20, or BEP20), and send USDT to the displayed address. Your balance will be updated after the required confirmations.',
      answerKey: 'faq.deposit.how.answer',
      sortOrder: 1,
    },
    {
      categoryId: savedCategories[0].id,
      question: 'What is the minimum deposit amount?',
      questionKey: 'faq.deposit.minimum',
      answer: 'The minimum deposit amount is 10 USDT for all networks. Deposits below this amount may not be credited to your account.',
      answerKey: 'faq.deposit.minimum.answer',
      sortOrder: 2,
    },
    {
      categoryId: savedCategories[0].id,
      question: 'How long does a deposit take?',
      questionKey: 'faq.deposit.time',
      answer: 'TRC20: ~3 minutes (20 confirmations), ERC20: ~5 minutes (12 confirmations), BEP20: ~3 minutes (15 confirmations). Times may vary during network congestion.',
      answerKey: 'faq.deposit.time.answer',
      sortOrder: 3,
    },
    // Virtual Card
    {
      categoryId: savedCategories[1].id,
      question: 'What is a virtual card?',
      questionKey: 'faq.card.what',
      answer: 'A virtual debit card that allows you to make online purchases globally using your USDT balance. It works like a regular Visa/Mastercard for online payments.',
      answerKey: 'faq.card.what.answer',
      sortOrder: 1,
    },
    {
      categoryId: savedCategories[1].id,
      question: 'How much does it cost to apply for a card?',
      questionKey: 'faq.card.cost',
      answer: 'Enjoy Card: $10 opening fee + $20 deposit. Universal Card: $10 opening fee + $50 deposit. Monthly fees may apply depending on your card type.',
      answerKey: 'faq.card.cost.answer',
      sortOrder: 2,
    },
    {
      categoryId: savedCategories[1].id,
      question: 'Where can I use my virtual card?',
      questionKey: 'faq.card.where',
      answer: 'Your virtual card can be used for online purchases at any merchant that accepts Visa/Mastercard. It cannot be used for ATM withdrawals or in-person payments.',
      answerKey: 'faq.card.where.answer',
      sortOrder: 3,
    },
    // Remittance
    {
      categoryId: savedCategories[2].id,
      question: 'Which countries do you support for remittance?',
      questionKey: 'faq.remit.countries',
      answer: 'We currently support remittance to Thailand, Vietnam, Philippines, Indonesia, and more countries are being added regularly.',
      answerKey: 'faq.remit.countries.answer',
      sortOrder: 1,
    },
    {
      categoryId: savedCategories[2].id,
      question: 'What are the remittance fees?',
      questionKey: 'faq.remit.fees',
      answer: 'Fees vary by destination country and amount. You can see the exact fee before confirming any transaction. Typical fees range from 1-3%.',
      answerKey: 'faq.remit.fees.answer',
      sortOrder: 2,
    },
    // Account Security
    {
      categoryId: savedCategories[3].id,
      question: 'How do I enable Two-Factor Authentication (2FA)?',
      questionKey: 'faq.security.2fa',
      answer: 'Go to Settings > Security > Two-Factor Authentication. Scan the QR code with Google Authenticator or similar app, then enter the 6-digit code to enable.',
      answerKey: 'faq.security.2fa.answer',
      sortOrder: 1,
    },
    {
      categoryId: savedCategories[3].id,
      question: 'I forgot my payment password, what should I do?',
      questionKey: 'faq.security.forgot.password',
      answer: 'Go to Settings > Security > Payment Password > Reset. You will need to verify your email to reset your payment password.',
      answerKey: 'faq.security.forgot.password.answer',
      sortOrder: 2,
    },
    // KYC
    {
      categoryId: savedCategories[4].id,
      question: 'Why do I need to complete KYC?',
      questionKey: 'faq.kyc.why',
      answer: 'KYC verification is required to comply with regulations and increase your transaction limits. Higher KYC levels unlock higher daily and monthly limits.',
      answerKey: 'faq.kyc.why.answer',
      sortOrder: 1,
    },
    {
      categoryId: savedCategories[4].id,
      question: 'What documents are accepted for KYC?',
      questionKey: 'faq.kyc.documents',
      answer: 'We accept government-issued ID cards, passports, and driver\'s licenses. Documents must be valid and clearly readable.',
      answerKey: 'faq.kyc.documents.answer',
      sortOrder: 2,
    },
  ];

  await faqRepo.save(faqItems);

  console.log('FAQ seed data created successfully');
}
