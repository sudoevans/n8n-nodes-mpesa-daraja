import {
    IAuthenticateGeneric,
    ICredentialDataDecryptedObject,
    ICredentialType,
    IHttpRequestHelper,
    IHttpRequestOptions,
    INodeProperties,
    ICredentialTestRequest,
} from 'n8n-workflow';

export class MpesaApi implements ICredentialType {
    name = 'mpesaApi';
    displayName = 'M-Pesa API';
    documentationUrl = 'https://developer.safaricom.co.ke/apis';
    icon = 'file:../nodes/Mpesa/mpesa.svg' as const;
    properties: INodeProperties[] = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'hidden',
            typeOptions: {
                expirable: true,
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Environment',
            name: 'environment',
            type: 'options',
            options: [
                {
                    name: 'Sandbox',
                    value: 'sandbox',
                },
                {
                    name: 'Production',
                    value: 'production',
                },
            ],
            default: 'sandbox',
            description: 'Select the M-Pesa environment to use',
        },
        {
            displayName: 'Consumer Key',
            name: 'consumerKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'The Consumer Key from your Safaricom Developer Portal app',
        },
        {
            displayName: 'Consumer Secret',
            name: 'consumerSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'The Consumer Secret from your Safaricom Developer Portal app',
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
            description: 'The Lipa na M-Pesa Online passkey from your Safaricom Daraja app',
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
            description: 'The encrypted credential used for B2B, B2C, Account, and Identity requests',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };

    async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
        const environment = credentials.environment as string;
        const consumerKey = credentials.consumerKey as string;
        const consumerSecret = credentials.consumerSecret as string;
        const baseUrl = environment === 'sandbox'
            ? 'https://sandbox.safaricom.co.ke'
            : 'https://api.safaricom.co.ke';

        const response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${baseUrl}/oauth/v1/generate`,
            qs: {
                grant_type: 'client_credentials',
            },
            auth: {
                username: consumerKey,
                password: consumerSecret,
            },
            returnFullResponse: false,
        } as IHttpRequestOptions);

        return {
            accessToken: response.access_token as string,
        };
    }

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.environment === "sandbox" ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke"}}',
            url: '/oauth/v1/generate',
            method: 'GET',
            qs: {
                grant_type: 'client_credentials',
            },
            auth: {
                username: '={{$credentials.consumerKey}}',
                password: '={{$credentials.consumerSecret}}',
            },
        },
    };
}
