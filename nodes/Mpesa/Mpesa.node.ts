import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { mpesaApiRequest } from './GenericFunctions';

export class Mpesa implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'M-Pesa',
        name: 'mpesa',
        icon: 'file:mpesa.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume M-Pesa Daraja 3.0 APIs',
        defaults: {
            name: 'M-Pesa',
        },
        inputs: ['main'],
        outputs: ['main'],
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
                        name: 'STK Push',
                        value: 'stkPush',
                    },
                    {
                        name: 'C2B',
                        value: 'c2b',
                    },
                    {
                        name: 'B2C',
                        value: 'b2c',
                    },
                    {
                        name: 'B2B',
                        value: 'b2b',
                    },
                    {
                        name: 'Account',
                        value: 'account',
                    },
                    {
                        name: 'Identity',
                        value: 'identity',
                    },
                    {
                        name: 'Pull API',
                        value: 'pull',
                    },
                ],
                default: 'stkPush',
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
                        description: 'Initiate an STK Push payment. [Docs](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate)',
                        action: 'Initiate STK Push',
                    },
                    {
                        name: 'Query Status',
                        value: 'queryStatus',
                        description: 'Check the status of an STK Push transaction. [Docs](https://developer.safaricom.co.ke/APIs/MpesaExpressQuery)',
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
                        description: 'Register validation and confirmation URLs. [Docs](https://developer.safaricom.co.ke/APIs/CustomerToBusinessRegisterURL)',
                        action: 'Register C2B URLs',
                    },
                    {
                        name: 'Simulate',
                        value: 'simulate',
                        description: 'Simulate a C2B transaction. [Docs](https://developer.safaricom.co.ke/APIs/CustomerToBusinessSimulate)',
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
                        description: 'Send money to customers (B2C). [Docs](https://developer.safaricom.co.ke/APIs/BusinessToCustomer)',
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
                        description: 'Send money to other businesses (B2B). [Docs](https://developer.safaricom.co.ke/APIs/BusinessToBusiness)',
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
                        description: 'Check subscriber status (IMSI). [Docs](https://developer.safaricom.co.ke/APIs/Authorization)',
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
                        description: 'Register callback URL for pull transactions. [Docs](https://developer.safaricom.co.ke/APIs/PullTransactionsRegisterURL)',
                        action: 'Register Pull URL',
                    },
                    {
                        name: 'Query',
                        value: 'query',
                        description: 'Query pull transactions. [Docs](https://developer.safaricom.co.ke/APIs/PullTransactionsQuery)',
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
                        description: 'Check account balance. [Docs](https://developer.safaricom.co.ke/APIs/AccountBalance)',
                        action: 'Check Account Balance',
                    },
                    {
                        name: 'Transaction Status',
                        value: 'transactionStatus',
                        description: 'Check status of a transaction. [Docs](https://developer.safaricom.co.ke/APIs/TransactionStatus)',
                        action: 'Check Transaction Status',
                    },
                    {
                        name: 'Reversal',
                        value: 'reversal',
                        description: 'Reverse a transaction. [Docs](https://developer.safaricom.co.ke/APIs/Reversal)',
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
                description: 'The organization shortcode used to receive the transaction',
            },
            {
                displayName: 'Passkey',
                name: 'passkey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['stkPush'],
                        operation: ['initiate', 'queryStatus'],
                    },
                },
                description: 'Used to generate the password',
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
            },
            {
                displayName: 'Response Type',
                name: 'responseType',
                type: 'options',
                options: [
                    {
                        name: 'Completed',
                        value: 'Completed',
                    },
                    {
                        name: 'Cancelled',
                        value: 'Cancelled',
                    },
                ],
                default: 'Completed',
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['registerUrl'],
                    },
                },
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
                displayName: 'Msisdn',
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
                description: 'Phone number (format: 2547xxxxxxxx)',
            },
            {
                displayName: 'Command ID',
                name: 'commandId',
                type: 'options',
                options: [
                    {
                        name: 'CustomerPayBillOnline',
                        value: 'CustomerPayBillOnline',
                    },
                    {
                        name: 'CustomerBuyGoodsOnline',
                        value: 'CustomerBuyGoodsOnline',
                    },
                ],
                default: 'CustomerPayBillOnline',
                displayOptions: {
                    show: {
                        resource: ['c2b'],
                        operation: ['simulate'],
                    },
                },
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
            },
            {
                displayName: 'Security Credential',
                name: 'securityCredential',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'account', 'b2b'],
                    },
                },
                description: 'Encrypted security credential',
            },
            {
                displayName: 'Command ID',
                name: 'commandId',
                type: 'options',
                options: [
                    {
                        name: 'Salary Payment',
                        value: 'SalaryPayment',
                    },
                    {
                        name: 'Business Payment',
                        value: 'BusinessPayment',
                    },
                    {
                        name: 'Promotion Payment',
                        value: 'PromotionPayment',
                    },
                ],
                default: 'BusinessPayment',
                displayOptions: {
                    show: {
                        resource: ['b2c'],
                        operation: ['paymentRequest'],
                    },
                },
            },
            {
                displayName: 'Command ID',
                name: 'commandId',
                type: 'options',
                options: [
                    {
                        name: 'Business Pay Bill',
                        value: 'BusinessPayBill',
                    },
                    {
                        name: 'Business Buy Goods',
                        value: 'BusinessBuyGoods',
                    },
                    {
                        name: 'Disburse Funds To Business',
                        value: 'DisburseFundsToBusiness',
                    },
                    {
                        name: 'Business To Business Transfer',
                        value: 'BusinessToBusinessTransfer',
                    },
                    {
                        name: 'Business Transfer From MM To Utility',
                        value: 'BusinessTransferFromMMToUtility',
                    },
                ],
                default: 'BusinessPayBill',
                displayOptions: {
                    show: {
                        resource: ['b2b'],
                        operation: ['paymentRequest'],
                    },
                },
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
                displayName: 'Party A',
                name: 'partyA',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['b2c', 'account', 'b2b'],
                    },
                },
                description: 'Shortcode',
            },
            {
                displayName: 'Party B',
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
                description: 'Phone number or Shortcode',
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
                    },
                ],
                default: 4,
                displayOptions: {
                    show: {
                        resource: ['account'],
                        operation: ['balance'],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                let responseData;
                if (resource === 'stkPush') {
                    if (operation === 'initiate') {
                        const businessShortCode = (this.getNodeParameter('businessShortCode', i) as string).trim();
                        const passkey = (this.getNodeParameter('passkey', i) as string).trim();
                        const amount = this.getNodeParameter('amount', i) as number;
                        const phoneNumber = (this.getNodeParameter('phoneNumber', i) as string).trim();
                        const callbackUrl = (this.getNodeParameter('callbackUrl', i) as string).trim();
                        const accountReference = this.getNodeParameter('accountReference', i) as string;
                        const transactionDesc = this.getNodeParameter('transactionDesc', i) as string;

                        // Calculate Timestamp in EAT (UTC+3)
                        const now = new Date();
                        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                        const eat = new Date(utc + (3600000 * 3));
                        const timestamp = eat.toISOString().replace(/[^0-9]/g, '').slice(0, 14);

                        const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');

                        const body = {
                            BusinessShortCode: businessShortCode,
                            Password: password,
                            Timestamp: timestamp,
                            TransactionType: 'CustomerPayBillOnline',
                            Amount: amount.toString(),
                            PartyA: phoneNumber,
                            PartyB: businessShortCode,
                            PhoneNumber: phoneNumber,
                            CallBackURL: callbackUrl,
                            AccountReference: accountReference,
                            TransactionDesc: transactionDesc,
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/stkpush/v1/processrequest', body);
                    } else if (operation === 'queryStatus') {
                        const businessShortCode = this.getNodeParameter('businessShortCode', i) as string;
                        const passkey = this.getNodeParameter('passkey', i) as string;
                        const checkoutRequestId = this.getNodeParameter('checkoutRequestId', i) as string;

                        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
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

                        const body = {
                            ShortCode: shortCode,
                            CommandID: commandId,
                            Amount: amount.toString(),
                            Msisdn: msisdn,
                            BillRefNumber: 'Simulate',
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/c2b/v1/simulate', body);
                    }
                } else if (resource === 'b2c') {
                    if (operation === 'paymentRequest') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = this.getNodeParameter('securityCredential', i) as string;
                        const commandId = this.getNodeParameter('commandId', i) as string;
                        const amount = this.getNodeParameter('amount', i) as number;
                        const partyA = this.getNodeParameter('partyA', i) as string;
                        const partyB = this.getNodeParameter('partyB', i) as string;
                        const remarks = this.getNodeParameter('remarks', i) as string;
                        const queueTimeOutUrl = this.getNodeParameter('queueTimeOutUrl', i) as string;
                        const resultUrl = this.getNodeParameter('resultUrl', i) as string;

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
                        };

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/b2c/v1/paymentrequest', body);
                    }
                } else if (resource === 'b2b') {
                    if (operation === 'paymentRequest') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = this.getNodeParameter('securityCredential', i) as string;
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

                        responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/b2b/v1/paymentrequest', body);
                    }
                } else if (resource === 'identity') {
                    if (operation === 'checkAti') {
                        const initiatorName = this.getNodeParameter('initiatorName', i) as string;
                        const securityCredential = this.getNodeParameter('securityCredential', i) as string;
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
                        const securityCredential = this.getNodeParameter('securityCredential', i) as string;
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
                    }
                }

                returnData.push({ json: responseData });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message } });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
