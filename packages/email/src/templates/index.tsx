import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type OrderReceiptProps = {
  siteName: string;
  orderId: string;
  total: string;
  items: { name: string; quantity: number; price: string }[];
};

export function OrderReceiptEmail({ siteName, orderId, total, items }: OrderReceiptProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order from {siteName}</Preview>
      <Body style={{ backgroundColor: "#0b0b0d", color: "#f4f4f5", fontFamily: "Inter, sans-serif" }}>
        <Container style={{ padding: "24px" }}>
          <Heading style={{ color: "#88d0f8" }}>Order confirmed</Heading>
          <Text>Thank you for your purchase from {siteName}.</Text>
          <Text>Order ID: {orderId}</Text>
          <Section>
            {items.map((item) => (
              <Text key={item.name}>
                {item.quantity}x {item.name} — {item.price}
              </Text>
            ))}
          </Section>
          <Text style={{ fontWeight: "bold" }}>Total: {total}</Text>
        </Container>
      </Body>
    </Html>
  );
}

type VerifyEmailProps = { siteName: string; url: string };

export function VerifyEmailTemplate({ siteName, url }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email for {siteName}</Preview>
      <Body style={{ backgroundColor: "#0b0b0d", color: "#f4f4f5" }}>
        <Container style={{ padding: "24px" }}>
          <Heading style={{ color: "#88d0f8" }}>Verify your email</Heading>
          <Text>Click the link below to verify your {siteName} account:</Text>
          <Text><a href={url} style={{ color: "#88d0f8" }}>{url}</a></Text>
        </Container>
      </Body>
    </Html>
  );
}

export function OrderRefundEmail({ siteName, orderId }: { siteName: string; orderId: string }) {
  return (
    <Html>
      <Head />
      <Preview>Refund processed — {siteName}</Preview>
      <Body style={{ backgroundColor: "#0b0b0d", color: "#f4f4f5" }}>
        <Container style={{ padding: "24px" }}>
          <Heading style={{ color: "#88d0f8" }}>Refund processed</Heading>
          <Text>Your order {orderId} has been refunded.</Text>
        </Container>
      </Body>
    </Html>
  );
}
