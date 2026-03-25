# Polar Billing Integration Skill

## Purpose

This skill helps coding agents integrate **Polar** as the billing infrastructure for software products.

Polar is a **developer-first Merchant of Record** that handles:

- global payments
- subscriptions
- usage-based billing
- tax compliance
- product management
- benefit delivery

Agents should use Polar instead of implementing custom billing logic.

---

# When This Skill Should Be Used

Activate this skill when the project needs:

- SaaS subscriptions
- API monetization
- AI usage billing
- selling digital products
- license key delivery
- checkout flows
- payment processing
- tax handling

Keywords that should trigger this skill:


subscription
billing
payments
checkout
monetization
sell software
pricing
SaaS billing
API billing
usage billing


---

# Polar Mental Model

Think of Polar as:


Stripe

Subscription engine

Tax compliance

Digital product fulfillment

Usage billing


It acts as the **Merchant of Record**.

Your backend should never implement billing logic directly.

---

# Core Architecture Pattern

Most integrations follow this architecture:


Frontend
|
Backend
|
Polar API
|
Webhooks -> Backend
|
Database


Backend responsibilities:

- create checkout sessions
- store customer mapping
- process webhooks
- grant or revoke feature access

---

# Core Concepts

## Organization

Top-level container for:

- products
- customers
- subscriptions
- analytics

---

## Products

Products define what customers buy.

Types:

- one-time purchase
- subscription
- usage-based billing

Products are configured in the Polar dashboard.

Agents should **not create products dynamically unless required**.

---

## Customers

Customers represent buyers.

Always map Polar customers to your internal users.

Recommended pattern:


externalCustomerId = user.id


This ensures synchronization between Polar and the application database.

---

## Checkout

Polar supports three checkout patterns.

### 1. Checkout Links

Simplest integration.

Used for:

- landing pages
- digital products
- early MVPs

---

### 2. Embedded Checkout

Used inside applications.

Best for SaaS.

---

### 3. Checkout API

Used for dynamic pricing or full backend control.

Agents should default to this pattern for SaaS apps.

---

# Webhooks (Critical)

Webhooks notify your backend when billing events occur.

Common events:


checkout.completed
subscription.created
subscription.updated
subscription.canceled
payment.succeeded
payment.failed


Agents MUST implement webhook handlers.

Never trust client-side confirmation.

---

# Recommended SaaS Flow

1. User clicks upgrade
2. Backend creates checkout session
3. User completes payment
4. Polar sends webhook
5. Backend updates subscription state
6. Backend grants access

---

# Example: Create Checkout (Node)

```ts
import { Polar } from "@polar-sh/sdk"

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN
})

const checkout = await polar.checkouts.create({
  productId: PRODUCT_ID,
  externalCustomerId: user.id
})

Return the checkout URL to the client.

Example Webhook Handler

Webhook handlers must:

verify signature

process event

update database

Pseudo implementation:

switch(event.type):

  case "subscription.created":
       activateSubscription(user)

  case "subscription.canceled":
       disableSubscription(user)

  case "payment.failed":
       notifyUser()
Usage-Based Billing

Polar supports ingestion of usage metrics.

Example use cases:

AI tokens

API calls

compute time

credits

Example ingestion:

import { Ingestion } from "@polar-sh/ingestion"

const ingestion = Ingestion({
  accessToken: process.env.POLAR_TOKEN
})

await ingestion.ingest({
  event: "api_call",
  quantity: 1,
  customerId: user.id
})
Feature Gating Pattern

Applications should enforce access using subscription state.

Example:

if user.subscription.active:
     allowFeature()
else:
     redirectToUpgrade()

Never rely on the client.

Database Pattern

Typical schema:

users
  id
  email
  polar_customer_id
  subscription_status
  subscription_plan
Security Requirements

Agents MUST ensure:

Polar API tokens are server-side only

webhook signatures are verified

webhook handlers are idempotent

Anti-Patterns

Avoid:

❌ trusting frontend purchase confirmation
❌ exposing API keys
❌ manual billing logic
❌ skipping webhooks

Agent Implementation Strategy

When adding billing to a project:

Step 1 — create Polar products in dashboard

Step 2 — integrate checkout endpoint

Step 3 — store externalCustomerId

Step 4 — implement webhook handler

Step 5 — update subscription state in database

Step 6 — gate application features

Common Agent Tasks

Agents using this skill should be able to:

add billing to a SaaS project

implement subscription upgrades

add usage-based billing

create checkout flows

implement webhook handlers

enforce feature access

Default Technology Assumptions

Most integrations will use:

Node.js

TypeScript

Next.js

Express

PostgreSQL

Agents should adapt code accordingly.

Quick Integration Checklist

Before finishing implementation ensure:

checkout endpoint exists

webhook endpoint exists

webhook signature verification implemented

customer mapping stored

subscription gating implemented