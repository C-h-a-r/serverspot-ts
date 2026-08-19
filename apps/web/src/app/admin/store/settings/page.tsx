import { env } from "@serverspot/config/env";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminStoreSettingsPage() {
  const stripeConfigured = Boolean(env.STRIPE_SECRET_KEY);
  const paypalConfigured = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
  const smtpConfigured = Boolean(env.SMTP_HOST);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Store Settings</h1>
        <p className="text-muted-foreground">Currency, payment providers, checkout options</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment providers</CardTitle>
          <CardDescription>Configured via environment variables (.env)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Stripe</span>
            <Badge variant={stripeConfigured ? "default" : "secondary"}>
              {stripeConfigured ? "Configured" : "Not configured"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>PayPal</span>
            <Badge variant={paypalConfigured ? "default" : "secondary"}>
              {paypalConfigured ? "Configured" : "Not configured"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Order receipt email (SMTP)</span>
            <Badge variant={smtpConfigured ? "default" : "secondary"}>
              {smtpConfigured ? "Configured" : "JSON transport (dev)"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checkout flow</CardTitle>
          <CardDescription>Public routes: /store/checkout, /store/checkout/success</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Stripe webhooks: POST /api/webhooks/stripe</p>
          <p>PayPal return: /store/checkout/paypal/return</p>
          <p>Background jobs: order.fulfill, email.send (apps/worker)</p>
        </CardContent>
      </Card>
    </div>
  );
}
