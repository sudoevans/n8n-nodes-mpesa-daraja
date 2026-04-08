import {
    ICredentialDataDecryptedObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionTypes,
    NodeOperationError,
} from 'n8n-workflow';
import { mpesaApiRequest } from './GenericFunctions';

function getRequiredCredentialValue(
    credentials: ICredentialDataDecryptedObject,
    key: 'passkey' | 'securityCredential',
    label: string,
): string {
    const value = credentials[key];

    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${label} is missing from the M-Pesa API credentials.`);
    }

    return value.trim();
}

function getEastAfricaTimestamp(): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const eat = new Date(utc + (3 * 60 * 60 * 1000));

    return eat.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

function getStkPartyB(
    transactionType: string,
    businessShortCode: string,
    buyGoodsTillNumber?: string,
): string {
    if (transactionType === 'CustomerBuyGoodsOnline') {
        return (buyGoodsTillNumber ?? '').trim();
    }

    return businessShortCode.trim();
}

export class Mpesa implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'M-Pesa',
        name: 'mpesa',
        icon: 'file:mpesa.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
        description: 'Consume M-Pesa Daraja 3.0 APIs',
        documentationUrl: 'https://developer.safaricom.co.ke/apis',
        defaults: {
            name: 'M-Pesa',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'mpesaApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Account',
                        value: 'account',
                        description: 'Account operations like balance and status',
                    },
                    {
                        name: 'B2B',
                        value: 'b2b',
                        description: 'Business to Business payments',
                    },
                    {
                        name: 'B2C',
                        value: 'b2c',
                        description: 'Business to Customer disbursements',
                    },
                    {
                        name: 'C2B',
                        value: 'c2b',
                        description: 'Customer to Business payments',
                    },
                    {
                        name: 'Identity',
                        value: 'identity',
                        description: 'Identity verification services',
                    },
                    {
                        name: 'Pull API',
                        value: 'pull',
                        description: 'Pull transaction history',
                    },
                    {
                        name: 'STK Push',
                        value: 'stkPush',
                        description: 'Lipa na M-Pesa Online payment',
                    },
                ],
                default: 'stkPush',
                description: 'The M-Pesa API resource to use',
            },
            // STK Push Operations
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                    },
                },
                options: [
                    {
                        name: 'Initiate',
                        value: 'initiate',
                        description: 'Initiate an STK Push payment',
                        action: 'Initiate STK Push',
                    },
                    {
                        name: 'Query Status',
                        value: 'queryStatus',
                        description: 'Check the status of an STK Push transaction',
                        action: 'Check STK Push Status',
                    },
                ],
                default: 'initiate',
            },
            // C2B Operations
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                    },
                },
                options: [
                    {
                        name: 'Register URL',
                        value: 'registerUrl',
                        description: 'Register validation and confirmation URLs for C2B payments',
                        action: 'Register C2B URLs',
                    },
                    {
                        name: 'Simulate',
                        value: 'simulate',
                        description: 'Simulate a C2B transaction (sandbox only)',
                        action: 'Simulate C2B Transaction',
                    },
                ],
                default: 'registerUrl',
            },
            // B2C Operations
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['b2c'],
                    },
                },
                options: [
                    {
                        name: 'Payment Request',
                        value: 'paymentRequest',
                        description: 'Send money from your business to customers',
                        action: 'Send B2C Payment',
                    },
                ],
                default: 'paymentRequest',
            },
            // B2B Operations
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['b2b'],
                    },
                },
                options: [
                    {
                        name: 'Payment Request',
                        value: 'paymentRequest',
                        description: 'Send money from your business to another business',
                        action: 'Send B2B Payment',
                    },
                ],
                default: 'paymentRequest',
            },
            // Identity Operations
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['identity'],
                    },
                },
                options: [
                    {
                        name: 'Check ATI',
                        value: 'checkAti',
                        description: 'Check subscriber status via IMSI lookup',
                        action: 'Check Subscriber Status',
                    },
                ],
                default: 'checkAti',
            },
            // Pull API Operations
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['pull'],
                    },
                },
                options: [
                    {
                        name: 'Register URL',
                        value: 'registerUrl',
                        description: 'Register callback URL for pull transactions',
                        action: 'Register Pull URL',
                    },
                    {
                        name: 'Query',
                        value: 'query',
                        description: 'Query transaction history for a date range',
                        action: 'Query Pull Transactions',
                    },
                ],
                default: 'registerUrl',
            },
            // Account Operations
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['account'],
                    },
                },
                options: [
                    {
                        name: 'Balance',
                        value: 'balance',
                        description: 'Check your M-Pesa account balance',
                        action: 'Check Account Balance',
                    },
                    {
                        name: 'Transaction Status',
                        value: 'transactionStatus',
                        description: 'Check the status of an M-Pesa transaction',
                        action: 'Check Transaction Status',
                    },
                    {
                        name: 'Reversal',
                        value: 'reversal',
                        description: 'Reverse a completed M-Pesa transaction',
                        action: 'Reverse Transaction',
                    },
                ],
                default: 'balance',
            },
            // STK Push - Initiate Fields
            {
                displayName: 'Business Short Code',
                name: 'businessShortCode',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate', 'queryStatus'],
                    },
                },
                description:
                    'The organization shortcode. For Buy Goods, use the go-live organization shortcode and provide the till number separately as Party B.',
            },
            {
                displayName: 'Amount',
                name: 'amount',
                type: 'number',
                default: 1,
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate'],
                    },
                },
                description: 'The amount to be transacted',
            },
            {
                displayName: 'Phone Number',
                name: 'phoneNumber',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate'],
                    },
                },
                description: 'The phone number to receive the STK Push prompt (format: 2547xxxxxxxx)',
            },
            {
                displayName: 'Transaction Type',
                name: 'transactionType',
                type: 'options',
                options: [
                    {
                        name: 'Pay Bill',
                        value: 'CustomerPayBillOnline',
                        description: 'Payment to a Paybill number',
                    },
                    {
                        name: 'Buy Goods',
                        value: 'CustomerBuyGoodsOnline',
                        description: 'Payment to a Till number',
                    },
                ],
                default: 'CustomerPayBillOnline',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate'],
                    },
                },
                description: 'The type of transaction (PayBill or Till)',
            },
            {
                displayName: 'Till Number (Party B)',
                name: 'buyGoodsTillNumber',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate'],
                        transactionType: ['CustomerBuyGoodsOnline'],
                    },
                },
                description: 'The till number to send as Party B for Buy Goods transactions',
            },
            {
                displayName: 'Callback URL',
                name: 'callbackUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate'],
                    },
                },
                description: 'The URL where the results will be sent',
            },
            {
                displayName: 'Account Reference',
                name: 'accountReference',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate'],
                    },
                },
                description: 'Account Reference',
            },
            {
                displayName: 'Transaction Description',
                name: 'transactionDesc',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate'],
                    },
                },
                description: 'Description of the transaction',
            },
            // STK Push - Query Status Fields
            {
                displayName: 'Checkout Request ID',
                name: 'checkoutRequestId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['queryStatus'],
                    },
                },
                description: 'The Checkout Request ID returned from the initiate request',
            },
            // C2B - Register URL Fields
            {
                displayName: 'Short Code',
                name: 'shortCode',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['registerUrl', 'simulate'],
                    },
                },
                description: 'Your M-Pesa Paybill or Till number',
            },
            {
                displayName: 'Confirmation URL',
                name: 'confirmationUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['registerUrl'],
                    },
                },
                description: 'URL to receive payment confirmation callbacks, must be publicly accessible and https',
            },
            {
                displayName: 'Validation URL',
                name: 'validationUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['registerUrl'],
                    },
                },
                description: 'URL to receive payment validation requests, must be publicly accessible and https',
            },
            {
                displayName: 'Response Type',
                name: 'responseType',
                type: 'options',
                options: [
                    {
                        name: 'Completed',
                        value: 'Completed',
                        description: 'Complete the transaction automatically',
                    },
                    {
                        name: 'Cancelled',
                        value: 'Cancelled',
                        description: 'Cancel the transaction if validation fails',
                    },
                ],
                default: 'Completed',
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['registerUrl'],
                    },
                },
                description: 'Default response when validation URL is unreachable',
            },
            // C2B - Simulate Fields
            {
                displayName: 'Amount',
                name: 'amount',
                type: 'number',
                default: 100,
                required: true,
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['simulate'],
                    },
                },
            },
            {
                displayName: 'Phone Number',
                name: 'msisdn',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['simulate'],
                    },
                },
                description: 'Customer phone number (format: 2547xxxxxxxx)',
            },
            {
                displayName: 'Transaction Type',
                name: 'commandId',
                type: 'options',
                options: [
                    {
                        name: 'Pay Bill',
                        value: 'CustomerPayBillOnline',
                        description: 'Payment to a Paybill number',
                    },
                    {
                        name: 'Buy Goods',
                        value: 'CustomerBuyGoodsOnline',
                        description: 'Payment to a Till number',
                    },
                ],
                default: 'CustomerPayBillOnline',
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['simulate'],
                    },
                },
                description: 'The type of C2B transaction to simulate',
            },
            {
                displayName: 'Bill Reference Number',
                name: 'billRefNumber',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['simulate'],
                    },
                },
                description: 'Account number or reference for the transaction',
            },
            // B2B Fields
            {
                displayName: 'Initiator Name',
                name: 'initiatorName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'account', 'b2b'],
                    },
                },
                description: 'The username of the API operator as set on the M-Pesa portal',
            },
            {
                displayName: 'Payment Type',
                name: 'commandId',
                type: 'options',
                options: [
                    {
                        name: 'Salary Payment',
                        value: 'SalaryPayment',
                        description: 'Payment of salaries to employees',
                    },
                    {
                        name: 'Business Payment',
                        value: 'BusinessPayment',
                        description: 'General business payment to customer',
                    },
                    {
                        name: 'Promotion Payment',
                        value: 'PromotionPayment',
                        description: 'Promotional or reward payment',
                    },
                ],
                default: 'BusinessPayment',
                displayOptions: {
                    show: {
                        resource: ['b2c'],
                        operation: ['paymentRequest'],
                    },
                },
                description: 'The type of B2C payment to make',
            },
            {
                displayName: 'Payment Type',
                name: 'commandId',
                type: 'options',
                options: [
                    {
                        name: 'Business Pay Bill',
                        value: 'BusinessPayBill',
                        description: 'Pay to a Paybill number',
                    },
                    {
                        name: 'Business Buy Goods',
                        value: 'BusinessBuyGoods',
                        description: 'Pay to a Till number',
                    },
                    {
                        name: 'Disburse Funds To Business',
                        value: 'DisburseFundsToBusiness',
                        description: 'Transfer funds to another business',
                    },
                    {
                        name: 'Business To Business Transfer',
                        value: 'BusinessToBusinessTransfer',
                        description: 'Direct B2B transfer',
                    },
                    {
                        name: 'Merchant To Merchant Transfer',
                        value: 'BusinessTransferFromMMToUtility',
                        description: 'Transfer from merchant to utility',
                    },
                ],
                default: 'BusinessPayBill',
                displayOptions: {
                    show: {
                        resource: ['b2b'],
                        operation: ['paymentRequest'],
                    },
                },
                description: 'The type of B2B payment to make',
            },
            {
                displayName: 'Amount',
                name: 'amount',
                type: 'number',
                default: 100,
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'b2b'],
                        operation: ['paymentRequest'],
                    },
                },
            },
            {
                displayName: 'Sender Shortcode (Party A)',
                name: 'partyA',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'account', 'b2b'],
                    },
                },
                description: 'Your organization shortcode initiating the transaction',
            },
            {
                displayName: 'Receiver (Party B)',
                name: 'partyB',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'b2b'],
                        operation: ['paymentRequest'],
                    },
                },
                description: 'Phone number (B2C) or shortcode (B2B) receiving the payment',
            },
            {
                displayName: 'Sender Identifier Type',
                name: 'senderIdentifierType',
                type: 'options',
                options: [
                    {
                        name: 'Shortcode',
                        value: 4,
                    },
                ],
                default: 4,
                displayOptions: {
                    show: {
                        resource: ['b2b'],
                        operation: ['paymentRequest'],
                    },
                },
                description: 'Type of organization sending the payment',
            },
            {
                displayName: 'Receiver Identifier Type',
                name: 'receiverIdentifierType',
                type: 'options',
                options: [
                    {
                        name: 'Shortcode',
                        value: 4,
                    },
                ],
                default: 4,
                displayOptions: {
                    show: {
                        resource: ['b2b'],
                        operation: ['paymentRequest'],
                    },
                },
                description: 'Type of organization receiving the payment',
            },
            {
                displayName: 'Remarks',
                name: 'remarks',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'account', 'b2b'],
                    },
                },
                description: 'Comments sent along with the transaction',
            },
            {
                displayName: 'Queue Timeout URL',
                name: 'queueTimeOutUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'account', 'b2b'],
                    },
                },
                description: 'URL to receive notification if the request times out',
            },
            {
                displayName: 'Result URL',
                name: 'resultUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'account', 'b2b'],
                    },
                },
                description: 'URL to receive the transaction result callback',
            },
            {
                displayName: 'Account Reference',
                name: 'accountReference',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2b'],
                        operation: ['paymentRequest'],
                    },
                },
                description: 'Account number or reference for the B2B transaction',
            },
            // Identity Fields
            {
                displayName: 'Customer Number',
                name: 'customerNumber',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['identity'],
                        operation: ['checkAti'],
                    },
                },
                description: 'Phone number (format: 2547xxxxxxxx)',
            },
            // Pull API Fields
            {
                displayName: 'Short Code',
                name: 'shortCode',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['pull'],
                    },
                },
                description: 'Your M-Pesa shortcode for pull transactions',
            },
            {
                displayName: 'Request Type',
                name: 'requestType',
                type: 'string',
                default: 'Pull',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['pull'],
                        operation: ['registerUrl'],
                    },
                },
                description: 'Type of pull request (default: Pull)',
            },
            {
                displayName: 'Nominated Number',
                name: 'nominatedNumber',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['pull'],
                        operation: ['registerUrl'],
                    },
                },
                description: 'Phone number to receive pull transaction notifications',
            },
            {
                displayName: 'Callback URL',
                name: 'callbackUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['pull'],
                        operation: ['registerUrl'],
                    },
                },
            },
            {
                displayName: 'Start Date',
                name: 'startDate',
                type: 'dateTime',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['pull'],
                        operation: ['query'],
                    },
                },
                description: 'Start date for the transaction query range',
            },
            {
                displayName: 'End Date',
                name: 'endDate',
                type: 'dateTime',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['pull'],
                        operation: ['query'],
                    },
                },
                description: 'End date for the transaction query range',
            },
            {
                displayName: 'Offset Value',
                name: 'offsetValue',
                type: 'number',
                default: 0,
                required: true,
                displayOptions: {
                    show: {
                        resource: ['pull'],
                        operation: ['query'],
                    },
                },
                description: 'Number of records to skip for pagination',
            },
            // Account Balance Fields
            {
                displayName: 'Identifier Type',
                name: 'identifierType',
                type: 'options',
                options: [
                    {
                        name: 'Shortcode',
                        value: 4,
                        description: 'Paybill or Business shortcode',
                    },
                    {
                        name: 'Phone Number (MSISDN)',
                        value: 1,
                        description: 'Mobile phone number',
                    },
                    {
                        name: 'Till Number',
                        value: 2,
                        description: 'Buy Goods Till number',
                    },
                ],
                default: 4,
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['balance', 'transactionStatus'],
                    },
                },
                description: 'Type of identifier for the account',
            },
            // Transaction Status Fields
            {
                displayName: 'Transaction ID',
                name: 'transactionId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['transactionStatus'],
                    },
                },
                description: 'The M-Pesa transaction ID to query',
            },
            {
                displayName: 'Occasion',
                name: 'occasion',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['transactionStatus'],
                    },
                },
                description: 'Optional additional information',
            },
            // Reversal Fields
            {
                displayName: 'Transaction ID',
                name: 'transactionId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['reversal'],
                    },
                },
                description: 'The M-Pesa transaction ID to reverse',
            },
            {
                displayName: 'Amount',
                name: 'amount',
                type: 'number',
                default: 0,
                required: true,
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['reversal'],
                    },
                },
                description: 'The amount to reverse',
            },
            {
                displayName: 'Receiver Party',
                name: 'receiverParty',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['reversal'],
                    },
                },
                description: 'The shortcode receiving the reversed amount',
            },
            {
                displayName: 'Receiver Identifier Type',
                name: 'receiverIdentifierType',
                type: 'options',
                options: [
                    {
                        name: 'Shortcode',
                        value: 4,
                    },
                    {
                        name: 'MSISDN',
                        value: 1,
                    },
                    {
                        name: 'Till Number',
                        value: 2,
                    },
                ],
                default: 4,
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['reversal'],
                    },
                },
            },
            {
                displayName: 'Occasion',
                name: 'occasion',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['reversal'],
                    },
                },
                description: 'Optional additional information',
            },
            // B2C Occasion Field
            {
                displayName: 'Occasion',
                name: 'occasion',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['b2c'],
                        operation: ['paymentRequest'],
                    },
                },
                description: 'Optional additional information',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
        const credentials = await this.getCredentials('mpesaApi');

        for (let i = 0; i < items.length; i++) {
            try {
                let responseData;
                if (resource === 'stkPush') {
                    if (operation === 'initiate') {
                        const businessShortCode = (this.getNodeParameter('businessShortCode', i) as string).trim();
                        const passkey = getRequiredCredentialValue(credentials, 'passkey', 'Passkey');
                        const amount = this.getNodeParameter('amount', i) as number;
                        const phoneNumber = (this.getNodeParameter('phoneNumber', i) as string).trim();
                        const callbackUrl = (this.getNodeParameter('callbackUrl', i) as string).trim();
                        const accountReference = this.getNodeParameter('accountReference', i) as string;
                        const transactionDesc = this.getNodeParameter('transactionDesc', i) as string;
                        const transactionType = this.getNodeParameter('transactionType', i) as string;
                        const buyGoodsTillNumber =
                            transactionType === 'CustomerBuyGoodsOnline'
                                ? (this.getNodeParameter('buyGoodsTillNumber', i) as string)
                                : undefined;

                        const timestamp = getEastAfricaTimestamp();

                        const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');
                        const partyB = getStkPartyB(transactionType, businessShortCode, buyGoodsTillNumber);

                        const body = {
                            BusinessShortCode: businessShortCode,
                            Password: password,
                            Timestamp: timestamp,
                            TransactionType: transactionType,
                            Amount: amount.toString(),
                            PartyA: phoneNumber,
                            PartyB: partyB,
                            PhoneNumber: phoneNumber,
                            CallBackURL: callbackUrl,
                            AccountReference: accountReference,
                            TransactionDesc: transactionDesc,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/stkpush/v1/processrequest', body);
                    } else if (operation === 'queryStatus') {
                        const businessShortCode = this.getNodeParameter('businessShortCode', i) as string;
                        const passkey = getRequiredCredentialValue(credentials, 'passkey', 'Passkey');
                        const checkoutRequestId = this.getNodeParameter('checkoutRequestId', i) as string;

                        const timestamp = getEastAfricaTimestamp();
                        const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');

                        const body = {
                            BusinessShortCode: businessShortCode,
                            Password: password,
                            Timestamp: timestamp,
                            CheckoutRequestID: checkoutRequestId,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/stkpushquery/v1/query', body);
                    }
                } else if (resource === 'c2b') {
                    if (operation === 'registerUrl') {
                        const shortCode = this.getNodeParameter('shortCode', i) as string;
                        const confirmationUrl = this.getNodeParameter('confirmationUrl', i) as string;
                        const validationUrl = this.getNodeParameter('validationUrl', i) as string;
                        const responseType = this.getNodeParameter('responseType', i) as string;

                        const body = {
                            ShortCode: shortCode,
                            ResponseType: responseType,
                            ConfirmationURL: confirmationUrl,
                            ValidationURL: validationUrl,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/c2b/v1/registerurl', body);
                    } else if (operation === 'simulate') {
                        const shortCode = this.getNodeParameter('shortCode', i) as string;
                        const amount = this.getNodeParameter('amount', i) as number;
                        const msisdn = this.getNodeParameter('msisdn', i) as string;
                        const commandId = this.getNodeParameter('commandId', i) as string;
                        const billRefNumber = this.getNodeParameter('billRefNumber', i, '') as string;

                        const body = {
                            ShortCode: shortCode,
                            CommandID: commandId,
                            Amount: amount.toString(),
                            Msisdn: msisdn,
                            BillRefNumber: billRefNumber || 'Test',
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/c2b/v1/simulate', body);
                    }
                } else if (resource === 'b2c') {
                    if (operation === 'paymentRequest') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = getRequiredCredentialValue(credentials, 'securityCredential', 'Security Credential');
                        const commandId = this.getNodeParameter('commandId', i) as string;
                        const amount = this.getNodeParameter('amount', i) as number;
                        const partyA = this.getNodeParameter('partyA', i) as string;
                        const partyB = this.getNodeParameter('partyB', i) as string;
                        const remarks = this.getNodeParameter('remarks', i) as string;
                        const queueTimeOutUrl = this.getNodeParameter('queueTimeOutUrl', i) as string;
                        const resultUrl = this.getNodeParameter('resultUrl', i) as string;
                        const occasion = this.getNodeParameter('occasion', i, '') as string;

                        const body = {
                            InitiatorName: initiatorName,
                            SecurityCredential: securityCredential,
                            CommandID: commandId,
                            Amount: amount.toString(),
                            PartyA: partyA,
                            PartyB: partyB,
                            Remarks: remarks,
                            QueueTimeOutURL: queueTimeOutUrl,
                            ResultURL: resultUrl,
                            Occasion: occasion,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/b2c/v1/paymentrequest', body);
                    }
                } else if (resource === 'b2b') {
                    if (operation === 'paymentRequest') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = getRequiredCredentialValue(credentials, 'securityCredential', 'Security Credential');
                        const commandId = this.getNodeParameter('commandId', i) as string;
                        const amount = this.getNodeParameter('amount', i) as number;
                        const partyA = this.getNodeParameter('partyA', i) as string;
                        const partyB = this.getNodeParameter('partyB', i) as string;
                        const remarks = this.getNodeParameter('remarks', i) as string;
                        const queueTimeOutUrl = this.getNodeParameter('queueTimeOutUrl', i) as string;
                        const resultUrl = this.getNodeParameter('resultUrl', i) as string;
                        const accountReference = this.getNodeParameter('accountReference', i) as string;
                        const senderIdentifierType = this.getNodeParameter('senderIdentifierType', i) as number;
                        const receiverIdentifierType = this.getNodeParameter('receiverIdentifierType', i) as number;

                        const body = {
                            Initiator: initiatorName,
                            SecurityCredential: securityCredential,
                            CommandID: commandId,
                            Amount: amount.toString(),
                            PartyA: partyA,
                            PartyB: partyB,
                            Remarks: remarks,
                            QueueTimeOutURL: queueTimeOutUrl,
                            ResultURL: resultUrl,
                            AccountReference: accountReference,
                            SenderIdentifierType: senderIdentifierType,
                            RecieverIdentifierType: receiverIdentifierType,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/b2b/v3/paymentrequest', body);
                    }
                } else if (resource === 'identity') {
                    if (operation === 'checkAti') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = getRequiredCredentialValue(credentials, 'securityCredential', 'Security Credential');
                        const customerNumber = this.getNodeParameter('customerNumber', i) as string;

                        const body = {
                            Initiator: initiatorName,
                            SecurityCredential: securityCredential,
                            CommandID: 'CheckATI',
                            PartyA: customerNumber,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/checkidentity/v1/processrequest', body);
                    }
                } else if (resource === 'pull') {
                    if (operation === 'registerUrl') {
                        const shortCode = this.getNodeParameter('shortCode', i) as string;
                        const requestType = this.getNodeParameter('requestType', i) as string;
                        const nominatedNumber = this.getNodeParameter('nominatedNumber', i) as string;
                        const callbackUrl = this.getNodeParameter('callbackUrl', i) as string;

                        const body = {
                            ShortCode: shortCode,
                            RequestType: requestType,
                            NominatedNumber: nominatedNumber,
                            CallBackURL: callbackUrl,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/pulltransactions/v1/register', body);
                    } else if (operation === 'query') {
                        const shortCode = this.getNodeParameter('shortCode', i) as string;
                        const startDate = this.getNodeParameter('startDate', i) as string;
                        const endDate = this.getNodeParameter('endDate', i) as string;
                        const offsetValue = this.getNodeParameter('offsetValue', i) as number;

                        const body = {
                            ShortCode: shortCode,
                            StartDate: startDate,
                            EndDate: endDate,
                            OffSetValue: offsetValue.toString(),
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/pulltransactions/v1/query', body);
                    }
                } else if (resource === 'account') {
                    if (operation === 'balance') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = getRequiredCredentialValue(credentials, 'securityCredential', 'Security Credential');
                        const partyA = this.getNodeParameter('partyA', i) as string;
                        const identifierType = this.getNodeParameter('identifierType', i) as number;
                        const remarks = this.getNodeParameter('remarks', i) as string;
                        const queueTimeOutUrl = this.getNodeParameter('queueTimeOutUrl', i) as string;
                        const resultUrl = this.getNodeParameter('resultUrl', i) as string;

                        const body = {
                            Initiator: initiatorName,
                            SecurityCredential: securityCredential,
                            CommandID: 'AccountBalance',
                            PartyA: partyA,
                            IdentifierType: identifierType,
                            Remarks: remarks,
                            QueueTimeOutURL: queueTimeOutUrl,
                            ResultURL: resultUrl,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/accountbalance/v1/query', body);
                    } else if (operation === 'transactionStatus') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = getRequiredCredentialValue(credentials, 'securityCredential', 'Security Credential');
                        const transactionId = this.getNodeParameter('transactionId', i) as string;
                        const partyA = this.getNodeParameter('partyA', i) as string;
                        const identifierType = this.getNodeParameter('identifierType', i) as number;
                        const remarks = this.getNodeParameter('remarks', i) as string;
                        const queueTimeOutUrl = this.getNodeParameter('queueTimeOutUrl', i) as string;
                        const resultUrl = this.getNodeParameter('resultUrl', i) as string;
                        const occasion = this.getNodeParameter('occasion', i, '') as string;

                        const body = {
                            Initiator: initiatorName,
                            SecurityCredential: securityCredential,
                            CommandID: 'TransactionStatusQuery',
                            TransactionID: transactionId,
                            PartyA: partyA,
                            IdentifierType: identifierType,
                            ResultURL: resultUrl,
                            QueueTimeOutURL: queueTimeOutUrl,
                            Remarks: remarks,
                            Occasion: occasion,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/transactionstatus/v1/query', body);
                    } else if (operation === 'reversal') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = getRequiredCredentialValue(credentials, 'securityCredential', 'Security Credential');
                        const transactionId = this.getNodeParameter('transactionId', i) as string;
                        const amount = this.getNodeParameter('amount', i) as number;
                        const receiverParty = this.getNodeParameter('receiverParty', i) as string;
                        const receiverIdentifierType = this.getNodeParameter('receiverIdentifierType', i) as number;
                        const remarks = this.getNodeParameter('remarks', i) as string;
                        const queueTimeOutUrl = this.getNodeParameter('queueTimeOutUrl', i) as string;
                        const resultUrl = this.getNodeParameter('resultUrl', i) as string;
                        const occasion = this.getNodeParameter('occasion', i, '') as string;

                        const body = {
                            Initiator: initiatorName,
                            SecurityCredential: securityCredential,
                            CommandID: 'TransactionReversal',
                            TransactionID: transactionId,
                            Amount: amount.toString(),
                            ReceiverParty: receiverParty,
                            RecieverIdentifierType: receiverIdentifierType,  // Note: API has typo "Reciever"
                            ResultURL: resultUrl,
                            QueueTimeOutURL: queueTimeOutUrl,
                            Remarks: remarks,
                            Occasion: occasion,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/reversal/v1/request', body);
                    }
                }

                returnData.push({ json: responseData, pairedItem: { item: i } });
            } catch (error) {
                if (error instanceof Error && error.message.includes('is missing from the M-Pesa API credentials')) {
                    throw new NodeOperationError(this.getNode(), error.message, {
                        itemIndex: i,
                    });
                }

                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
