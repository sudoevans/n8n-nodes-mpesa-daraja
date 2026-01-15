# n8n-nodes-mpesa

<div align="center">
  <img src="https://n8n.io/n8n-logo.png" alt="n8n" width="150"/>
  <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" width="150"/>
</div>

This package provides n8n nodes to interact with the Safaricom M-Pesa Daraja API 3.0. Automate mobile payments, account balance checks, transaction status queries, and webhook handling for payment callbacks.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Credentials Setup](#credentials-setup)
- [Nodes](#nodes)
  - [M-Pesa Node](#m-pesa-node)
  - [M-Pesa Trigger Node](#m-pesa-trigger-node)
- [Operations](#operations)
- [Examples](#examples)
- [Resources](#resources)
- [License](#license)

## Prerequisites

Before using this integration, you need:

- An active n8n instance (self-hosted or cloud)
- A Safaricom developer account at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
- M-Pesa API credentials (Consumer Key and Consumer Secret)
- For production: Till/Paybill number and security credentials

## Installation

### Community Nodes (Recommended)

1. Go to Settings > Community Nodes in your n8n instance
2. Select Install
3. Enter `n8n-nodes-mpesa-daraja`
4. Agree to the risks and select Install
5. Restart n8n to load the new nodes

### Manual Installation

For self-hosted n8n instances:

```bash
cd /path/to/n8n/installation
npm install n8n-nodes-mpesa
# Restart n8n
```

## Credentials Setup

### Creating M-Pesa API Credentials

1. Go to your n8n instance
2. Navigate to Credentials > New
3. Search for "M-Pesa API" and select it
4. Fill in the following fields:

| Field | Description |
|-------|-------------|
| Consumer Key | Your app's consumer key from Safaricom developer portal |
| Consumer Secret | Your app's consumer secret from Safaricom developer portal |
| Environment | Select `Sandbox` for testing or `Production` for live transactions |

5. Click Create to save

### Getting Credentials from Safaricom

1. Visit [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Log in or create an account
3. Go to My Apps
4. Create a new app or select an existing one
5. Copy the Consumer Key and Consumer Secret

## Nodes

### M-Pesa Node

The M-Pesa node allows you to perform various operations with the M-Pesa API.

**Node Type:** Action

**Credentials Required:** M-Pesa API

### M-Pesa Trigger Node

The M-Pesa Trigger node listens for webhook callbacks from M-Pesa when transactions complete.

**Node Type:** Trigger

**Credentials Required:** None (uses webhooks)

## Operations

### STK Push (Lipa na M-Pesa)

Initiate mobile payment prompts directly to customer phones.

**Operations:**
- **Initiate:** Send an STK Push prompt to a customer's phone
- **Query Status:** Check the status of an STK Push transaction

**Use Cases:**
- E-commerce checkout flows
- Service payment collection
- Subscription renewals

### C2B (Customer to Business)

Register and simulate customer payments to your business.

**Operations:**
- **Register URL:** Register validation and confirmation URLs for C2B transactions
- **Simulate:** Test C2B transactions in sandbox environment

**Use Cases:**
- Till/Paybill payment automation
- Real-time payment validation
- Payment confirmation handling

### B2C (Business to Customer)

Send money from your business to customers.

**Operations:**
- **Payment Request:** Disburse funds to customer mobile wallets

**Use Cases:**
- Salary payments
- Customer refunds
- Promotional payouts
- Affiliate commissions

### B2B (Business to Business)

Transfer funds between business accounts.

**Operations:**
- **Payment Request:** Send payments to other businesses

**Use Cases:**
- Supplier payments
- Inter-company transfers
- Bulk disbursements

### Account Operations

Manage your M-Pesa account.

**Operations:**
- **Balance:** Check your M-Pesa account balance
- **Transaction Status:** Query the status of any transaction
- **Reversal:** Reverse a completed transaction

**Use Cases:**
- Automated balance monitoring
- Transaction reconciliation
- Error correction workflows

### Identity

Verify customer information.

**Operations:**
- **Check ATI:** Verify subscriber status via IMSI

### Pull API

Query transaction history.

**Operations:**
- **Register URL:** Register callback URL for pull transactions
- **Query:** Retrieve transaction history for a date range

## M-Pesa Trigger Events

The trigger node supports the following webhook events:

| Event | Description | Triggered When |
|-------|-------------|----------------|
| Payment Received | C2B confirmation callback | Customer pays to your Till/Paybill |
| STK Push Completed | Lipa na M-Pesa callback | STK Push transaction completes (success/failure) |
| B2C Completed | Business to Customer callback | B2C disbursement completes |
| B2B Completed | Business to Business callback | B2B payment completes |
| Reversal Completed | Transaction reversal callback | Reversal request completes |
| Account Balance Completed | Balance query callback | Account balance check completes |
| Transaction Status Completed | Status query callback | Transaction status check completes |

### Trigger Options

- **Only Successful Transactions:** Filter to trigger only on successful transactions (ResultCode = 0)
- **Normalize Output:** Transform callback payloads into a consistent format across all event types

## Examples

### Example 1: Process STK Push Payment

1. Add M-Pesa Trigger node
2. Select event: "STK Push Completed"
3. Enable "Only Successful Transactions"
4. Copy the webhook production URL
5. Use this URL when initiating STK Push via M-Pesa node
6. Add your business logic nodes (e.g., update database, send confirmation email)

### Example 2: Check Account Balance

1. Add M-Pesa node
2. Select Resource: "Account"
3. Select Operation: "Balance"
4. Fill in required fields:
   - Initiator Name
   - Security Credential
   - Party A (your shortcode)
   - Queue Timeout URL
   - Result URL (use M-Pesa Trigger webhook URL)
5. Execute the workflow

### Example 3: Automated Daily Balance Report

1. Add Schedule Trigger (daily at 9 AM)
2. Add M-Pesa node for Account Balance
3. Add M-Pesa Trigger for balance callback
4. Add Email node to send balance report
5. Activate workflow

## Resources

- [Safaricom Developer Portal](https://developer.safaricom.co.ke)
- [M-Pesa Daraja API Documentation](https://developer.safaricom.co.ke/Documentation)
- [n8n Documentation](https://docs.n8n.io)
- [n8n Community Forum](https://community.n8n.io)

## License

MIT

## Support

For issues or feature requests, please visit the [GitHub repository](https://github.com/sudoevans/n8n-nodes-mpesa).
