# Subscription Verification Scripts

This directory contains scripts for verifying subscription data in the database.

## Available Scripts

### 1. Basic Subscription Verification

Verifies that a user's subscription data exists and has the expected values.

```bash
npx ts-node scripts/verify-subscription.ts <email>
```

Example:

```bash
npx ts-node scripts/verify-subscription.ts ahmed2@test.com
```

### 2. Comprehensive Subscription Verification

Performs a complete verification of a user's subscription data, including:

- User record
- Subscription record
- Stripe customer data
- Stripe subscription data (for recurring plans)
- Payment records

```bash
npx ts-node scripts/verify-subscription-complete.ts <email>
```

Example:

```bash
npx ts-node scripts/verify-subscription-complete.ts ahmed2@test.com
```

### 3. Shell Script Helper

For convenience, you can use the shell script which automatically loads environment variables:

```bash
./scripts/verify-user-subscription.sh <email>
```

Example:

```bash
./scripts/verify-user-subscription.sh ahmed2@test.com
```

## What These Scripts Check

For a monthly basic plan subscription (like ahmed2@test.com), the scripts verify:

1. **User Record**

   - User exists in the database
   - User has basic information (name, email, etc.)

2. **Subscription Record**

   - Subscription exists and is linked to the user
   - Plan is set to BASIC_MONTHLY
   - Status is ACTIVE
   - Has a valid Stripe customer ID
   - Has a valid Stripe subscription ID (for recurring plans)
   - Has payment information

3. **Stripe Data** (comprehensive verification only)
   - Stripe customer exists and matches the user's email
   - For recurring plans, Stripe subscription exists and is active
   - Payment records exist and are successful

## Troubleshooting

If verification fails, the script will output detailed information about what's missing or incorrect. Common issues include:

- Missing Stripe customer ID
- Missing Stripe subscription ID for recurring plans
- Mismatched plan type
- Inactive subscription status
- Failed payment

## Running in Production

To run these scripts in a production environment:

```bash
NODE_ENV=production npx ts-node scripts/verify-subscription-complete.ts <email>
```

Or using the shell script:

```bash
NODE_ENV=production ./scripts/verify-user-subscription.sh <email>
```
