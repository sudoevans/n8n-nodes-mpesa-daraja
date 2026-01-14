import {
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
    IDataObject,
} from 'n8n-workflow';

/**
 * Normalized payment interface for consistent output across all callback types
 */
interface NormalizedPayment {
    transactionId: string;
    transactionType: 'c2b' | 'stkpush' | 'b2c' | 'b2b' | 'reversal' | 'balance' | 'transactionStatus';
    amount: number;
    status: 'success' | 'failed';
    resultCode: number;
    resultDescription: string;
    phoneNumber?: string;
    accountReference?: string;
    timestamp: string;
    rawPayload: IDataObject;
}

export class MpesaTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'M-Pesa Trigger',
        name: 'mpesaTrigger',
        icon: 'file:../../icons/mpesa.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["event"]}}',
        description: 'Handle M-Pesa Daraja API Callbacks',
        defaults: {
            name: 'M-Pesa Trigger',
        },
        inputs: [],
        outputs: ['main'],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                path: '={{$parameter["event"]}}',
            },
        ],
        properties: [
            {
                displayName: 'Event',
                name: 'event',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Payment Received',
                        value: 'payment.received',
                        description: 'Triggered when a customer pays to your Till or Paybill (C2B confirmation)',
                    },
                    {
                        name: 'STK Push Completed',
                        value: 'stkpush.completed',
                        description: 'Triggered when a Lipa na M-Pesa (STK Push) transaction completes',
                    },
                    {
                        name: 'B2C Completed',
                        value: 'b2c.completed',
                        description: 'Triggered when a Business-to-Customer disbursement completes',
                    },
                    {
                        name: 'B2B Completed',
                        value: 'b2b.completed',
                        description: 'Triggered when a Business-to-Business payment completes',
                    },
                    {
                        name: 'Reversal Completed',
                        value: 'reversal.completed',
                        description: 'Triggered when a transaction reversal completes',
                    },
                    {
                        name: 'Account Balance Completed',
                        value: 'balance.completed',
                        description: 'Triggered when an Account Balance query completes',
                    },
                    {
                        name: 'Transaction Status Completed',
                        value: 'transaction.status.completed',
                        description: 'Triggered when a Transaction Status query completes',
                    },
                ],
                default: 'payment.received',
                description: 'The M-Pesa callback event to listen for',
            },
            {
                displayName: 'Only Successful Transactions',
                name: 'successOnly',
                type: 'boolean',
                default: true,
                description: 'Whether to only trigger on successful transactions (ResultCode = 0)',
            },
            {
                displayName: 'Normalize Output',
                name: 'normalizeOutput',
                type: 'boolean',
                default: true,
                description: 'Whether to normalize the callback payload to a consistent format',
            },
        ],
    };

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const req = this.getRequestObject();
        const body = req.body as IDataObject;
        const event = this.getNodeParameter('event') as string;
        const successOnly = this.getNodeParameter('successOnly') as boolean;
        const normalizeOutput = this.getNodeParameter('normalizeOutput') as boolean;

        let normalized: NormalizedPayment | null = null;
        let resultCode = 0;

        // Parse and normalize based on event type
        switch (event) {
            case 'payment.received':
                normalized = normalizeC2BPayment(body);
                resultCode = 0;
                break;

            case 'stkpush.completed':
                normalized = normalizeSTKPush(body);
                resultCode = normalized?.resultCode ?? 0;
                break;

            case 'b2c.completed':
                normalized = normalizeB2CResult(body);
                resultCode = normalized?.resultCode ?? 0;
                break;

            case 'b2b.completed':
                normalized = normalizeB2BResult(body);
                resultCode = normalized?.resultCode ?? 0;
                break;

            case 'reversal.completed':
                normalized = normalizeReversalResult(body);
                resultCode = normalized?.resultCode ?? 0;
                break;

            case 'balance.completed':
                normalized = normalizeAccountBalance(body);
                resultCode = normalized?.resultCode ?? 0;
                break;

            case 'transaction.status.completed':
                normalized = normalizeTransactionStatus(body);
                resultCode = normalized?.resultCode ?? 0;
                break;

            default:
                normalized = {
                    transactionId: 'unknown',
                    transactionType: 'c2b',
                    amount: 0,
                    status: 'success',
                    resultCode: 0,
                    resultDescription: 'Unknown event type',
                    timestamp: new Date().toISOString(),
                    rawPayload: body,
                };
        }

        // Filter failed transactions if successOnly is enabled
        if (successOnly && resultCode !== 0) {
            return {
                webhookResponse: {
                    ResultCode: 0,
                    ResultDesc: 'Accepted',
                },
                workflowData: undefined,
            };
        }

        const outputData = normalizeOutput && normalized ? normalized : body;

        return {
            webhookResponse: {
                ResultCode: 0,
                ResultDesc: 'Accepted',
            },
            workflowData: [
                [
                    {
                        json: outputData as IDataObject,
                    },
                ],
            ],
        };
    }
}

/**
 * Format M-Pesa timestamp (YYYYMMDDHHmmss) to ISO format
 */
function formatMpesaTimestamp(timestamp: string): string {
    if (!timestamp || timestamp.length !== 14) {
        return new Date().toISOString();
    }
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`).toISOString();
}

/**
 * Normalize C2B (Customer-to-Business) payment callback
 */
function normalizeC2BPayment(body: IDataObject): NormalizedPayment {
    return {
        transactionId: (body.TransID as string) || '',
        transactionType: 'c2b',
        amount: parseFloat((body.TransAmount as string) || '0'),
        status: 'success',
        resultCode: 0,
        resultDescription: 'Payment received',
        phoneNumber: (body.MSISDN as string) || '',
        accountReference: (body.BillRefNumber as string) || '',
        timestamp: formatMpesaTimestamp(body.TransTime as string),
        rawPayload: body,
    };
}

/**
 * Normalize STK Push (Lipa na M-Pesa) callback
 */
function normalizeSTKPush(body: IDataObject): NormalizedPayment {
    const stkCallback = ((body.Body as IDataObject)?.stkCallback as IDataObject) || {};
    const resultCode = (stkCallback.ResultCode as number) || 0;
    const callbackMetadata = (stkCallback.CallbackMetadata as IDataObject)?.Item as IDataObject[] || [];

    const metadata: Record<string, unknown> = {};
    for (const item of callbackMetadata) {
        const name = item.Name as string;
        metadata[name] = item.Value;
    }

    return {
        transactionId: (metadata.MpesaReceiptNumber as string) || (stkCallback.CheckoutRequestID as string) || '',
        transactionType: 'stkpush',
        amount: (metadata.Amount as number) || 0,
        status: resultCode === 0 ? 'success' : 'failed',
        resultCode,
        resultDescription: (stkCallback.ResultDesc as string) || '',
        phoneNumber: String(metadata.PhoneNumber || ''),
        timestamp: new Date().toISOString(),
        rawPayload: body,
    };
}

/**
 * Normalize B2C (Business-to-Customer) result callback
 */
function normalizeB2CResult(body: IDataObject): NormalizedPayment {
    const result = (body.Result as IDataObject) || {};
    const resultCode = (result.ResultCode as number) || 0;
    const resultParams = (result.ResultParameters as IDataObject)?.ResultParameter as IDataObject[] || [];

    const params: Record<string, unknown> = {};
    for (const param of resultParams) {
        const key = param.Key as string;
        params[key] = param.Value;
    }

    return {
        transactionId: (params.TransactionReceipt as string) || (result.TransactionID as string) || '',
        transactionType: 'b2c',
        amount: (params.TransactionAmount as number) || 0,
        status: resultCode === 0 ? 'success' : 'failed',
        resultCode,
        resultDescription: (result.ResultDesc as string) || '',
        phoneNumber: (params.ReceiverPartyPublicName as string) || '',
        timestamp: new Date().toISOString(),
        rawPayload: body,
    };
}

/**
 * Normalize B2B (Business-to-Business) result callback
 */
function normalizeB2BResult(body: IDataObject): NormalizedPayment {
    const result = (body.Result as IDataObject) || {};
    const resultCode = (result.ResultCode as number) || 0;
    const resultParams = (result.ResultParameters as IDataObject)?.ResultParameter as IDataObject[] || [];

    const params: Record<string, unknown> = {};
    for (const param of resultParams) {
        const key = param.Key as string;
        params[key] = param.Value;
    }

    return {
        transactionId: (params.TransactionReceipt as string) || (result.TransactionID as string) || '',
        transactionType: 'b2b',
        amount: (params.TransactionAmount as number) || (params.Amount as number) || 0,
        status: resultCode === 0 ? 'success' : 'failed',
        resultCode,
        resultDescription: (result.ResultDesc as string) || '',
        accountReference: (params.DebitAccountBalance as string) || '',
        timestamp: new Date().toISOString(),
        rawPayload: body,
    };
}

/**
 * Normalize Reversal result callback
 */
function normalizeReversalResult(body: IDataObject): NormalizedPayment {
    const result = (body.Result as IDataObject) || {};
    const resultCode = (result.ResultCode as number) || 0;
    const resultParams = (result.ResultParameters as IDataObject)?.ResultParameter as IDataObject[] || [];

    const params: Record<string, unknown> = {};
    for (const param of resultParams) {
        const key = param.Key as string;
        params[key] = param.Value;
    }

    return {
        transactionId: (result.TransactionID as string) || (params.OriginalTransactionID as string) || '',
        transactionType: 'reversal',
        amount: (params.Amount as number) || (params.TransactionAmount as number) || 0,
        status: resultCode === 0 ? 'success' : 'failed',
        resultCode,
        resultDescription: (result.ResultDesc as string) || '',
        timestamp: new Date().toISOString(),
        rawPayload: body,
    };
}

/**
 * Normalize Account Balance callback
 */
function normalizeAccountBalance(body: IDataObject): NormalizedPayment {
    const result = (body.Result as IDataObject) || {};
    const resultCode = (result.ResultCode as number) || 0;
    const resultParams = (result.ResultParameters as IDataObject)?.ResultParameter as IDataObject[] || [];

    const params: Record<string, unknown> = {};
    for (const param of resultParams) {
        const key = param.Key as string;
        params[key] = param.Value;
    }

    return {
        transactionId: (result.ConversationID as string) || (result.TransactionID as string) || '',
        transactionType: 'balance',
        amount: 0, // Balance queries don't have a transaction amount
        status: resultCode === 0 ? 'success' : 'failed',
        resultCode,
        resultDescription: (result.ResultDesc as string) || '',
        accountReference: (params.AccountBalance as string) || '',
        timestamp: new Date().toISOString(),
        rawPayload: body,
    };
}

/**
 * Normalize Transaction Status callback
 */
function normalizeTransactionStatus(body: IDataObject): NormalizedPayment {
    const result = (body.Result as IDataObject) || {};
    const resultCode = (result.ResultCode as number) || 0;
    const resultParams = (result.ResultParameters as IDataObject)?.ResultParameter as IDataObject[] || [];

    const params: Record<string, unknown> = {};
    for (const param of resultParams) {
        const key = param.Key as string;
        params[key] = param.Value;
    }

    return {
        transactionId: (params.ReceiptNo as string) || (result.TransactionID as string) || '',
        transactionType: 'transactionStatus',
        amount: (params.Amount as number) || 0,
        status: (params.TransactionStatus as string) === 'Completed' || resultCode === 0 ? 'success' : 'failed',
        resultCode,
        resultDescription: (result.ResultDesc as string) || (params.TransactionReason as string) || '',
        phoneNumber: (params.DebitPartyPublicName as string) || (params.CreditPartyPublicName as string) || '',
        timestamp: new Date().toISOString(),
        rawPayload: body,
    };
}

