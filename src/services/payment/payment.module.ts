import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { PayPalService } from './paypal.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [StripeService, PayPalService],
  exports: [StripeService, PayPalService],
})
export class PaymentModule {}
