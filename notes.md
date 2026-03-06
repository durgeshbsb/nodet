practice, payment gateway subscription autopay model
payment gateway long time delay solution
google firebase notification

webhook vs api


<script async src="https://js.stripe.com/v3/pricing-table.js"></script>
<stripe-pricing-table pricing-table-id="prctbl_1T2nM62cXaszDcHd5MdJbdPV"
publishable-key="pk_test_51T2Wra2cXaszDcHdbu9xCu37zM3y8uXDkTilSm6FFaLsAbCjRgFl2CW3QHvFskb3PC53wVEb0S6zStQz3hdun6f800JQ0IfcWP">
</stripe-pricing-table>

pi_3T2nNa2cXaszDcHd1gc21Uc8_secret_CxIIp3VxNmq5s8jKLoFMlQaOu


User opens checkout page
↓
User clicks Pay
↓
Frontend asks backend to create PaymentIntent
↓
Stripe returns clientSecret
↓
Stripe UI shows all methods (UPI / Card / NetBanking)
↓
User pays (maybe instant, maybe delayed)
↓
Stripe redirects user (success page)
↓
Stripe webhook fires (FINAL truth)
↓
Backend updates DB + sends notification