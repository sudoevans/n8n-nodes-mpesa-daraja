import {
    IAdditionalCredentialOptions,
    ICredentialDataDecryptedObject,
    IExecuteFunctions,
    IHookFunctions,
    ILoadOptionsFunctions,
    IDataObject,
    JsonObject,
    NodeApiError,
    IHttpRequestOptions,
    IHttpRequestMethods,
} from 'n8n-workflow';

function getBaseUrl(environment: string): string {
    return environment === 'sandbox'
        ? 'https://sandbox.safaricom.co.ke'
        : 'https://api.safaricom.co.ke';
}

export async function mpesaApiRequest(
    this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
    method: IHttpRequestMethods,
    endpoint: string,
    body: any = {},
    qs: IDataObject = {},
): Promise<any> {
    const credentials = await this.getCredentials('mpesaApi');
    const environment = credentials.environment as string;
    const baseUrl = getBaseUrl(environment);
    const credentialsWithFreshToken: ICredentialDataDecryptedObject = {
        ...credentials,
        accessToken: '',
    };
    const credentialOptions: IAdditionalCredentialOptions = {
        credentialsDecrypted: {
            id: 'mpesaApi',
            name: 'mpesaApi',
            type: 'mpesaApi',
            data: credentialsWithFreshToken,
        },
    };
    const options: IHttpRequestOptions = {
        method,
        url: `${baseUrl}${endpoint}`,
        headers: {
            'Content-Type': 'application/json',
        },
        qs,
        returnFullResponse: false,
    };

    if (Object.keys(body).length > 0) {
        options.body = body;
    }

    try {
        return await this.helpers.httpRequestWithAuthentication.call(
            this,
            'mpesaApi',
            options,
            credentialOptions,
        );
    } catch (error) {
        throw new NodeApiError(this.getNode(), error as JsonObject);
    }
}
