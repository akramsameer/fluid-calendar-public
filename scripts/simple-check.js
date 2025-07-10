#!/usr/bin/env node
/**
 * Simple Subscription Check Script
 * 
 * This script checks the subscription status of a specific user in the database.
 * It's a simpler version that doesn't require TypeScript compilation.
 * 
 * Usage:
 * node scripts/simple-check.js ahmed2@test.com
 */

// Import the PrismaClient
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function checkSubscription(email) {
  console.log(`\n=== Checking subscription for ${email} ===\n`);
  console.log('Connecting to database...');
  
  try {
    // Find the user and their subscription
    console.log(`Looking for user with email: ${email}`);
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscription: true,
      },
    });

    console.log('Database query completed');
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      
      // Let's check if there are any users in the database
      const userCount = await prisma.user.count();
      console.log(`Total users in database: ${userCount}`);
      
      if (userCount > 0) {
        // Show a few sample users
        const sampleUsers = await prisma.user.findMany({
          take: 3,
          select: { email: true }
        });
        console.log('Sample users:', sampleUsers.map(u => u.email));
      }
      
      return false;
    }

    console.log(`✅ User found: ${user.id}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.createdAt}`);
    
    // Check if subscription exists
    if (!user.subscription) {
      console.error(`❌ No subscription found for user: ${email}`);
      return false;
    }
    
    const sub = user.subscription;
    console.log(`\n✅ Subscription found: ${sub.id}`);
    console.log(`   Plan: ${sub.plan}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Created: ${sub.createdAt}`);
    console.log(`   Updated: ${sub.updatedAt}`);
    console.log(`   Amount: ${sub.amount || 'N/A'}`);
    console.log(`   Stripe Customer ID: ${sub.stripeCustomerId || 'N/A'}`);
    console.log(`   Stripe Subscription ID: ${sub.stripeSubscriptionId || 'N/A'}`);
    console.log(`   Stripe Payment Intent ID: ${sub.stripePaymentIntentId || 'N/A'}`);
    
    // Check for expected values for a monthly basic plan
    const expectedPlan = 'BASIC_MONTHLY';
    const expectedStatus = 'ACTIVE';
    
    const issues = [];
    
    if (sub.plan !== expectedPlan) {
      issues.push(`Plan mismatch: expected ${expectedPlan}, got ${sub.plan}`);
    }
    
    if (sub.status !== expectedStatus) {
      issues.push(`Status mismatch: expected ${expectedStatus}, got ${sub.status}`);
    }
    
    if (!sub.stripeCustomerId) {
      issues.push('Missing Stripe customer ID');
    }
    
    if (!sub.stripeSubscriptionId && (sub.plan.includes('MONTHLY') || sub.plan.includes('YEARLY'))) {
      issues.push('Missing Stripe subscription ID for recurring plan');
    }
    
    // Report any issues
    if (issues.length > 0) {
      console.log('\n❌ Issues found:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      return false;
    }
    
    console.log('\n✅ All subscription data looks good!');
    return true;
  } catch (error) {
    console.error(`\n❌ Error checking subscription: ${error.message}`);
    if (error.stack) console.error(error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed');
  }
}

// Main execution
async function main() {
  const email = process.argv[2] || 'ahmed2@test.com';
  
  console.log('Starting subscription check script');
  console.log(`Email to check: ${email}`);
  
  const success = await checkSubscription(email);
  
  if (success) {
    console.log(`\n✅ Subscription verification successful for ${email}`);
    process.exit(0);
  } else {
    console.error(`\n❌ Subscription verification failed for ${email}`);
    process.exit(1);
  }
}

// Call main and handle errors
console.log('Script initialized');
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 