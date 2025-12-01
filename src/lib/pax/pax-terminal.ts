import { v4 as uuidv4 } from 'uuid';

export interface PaxConfig {
    ip: string;
    port: string;
    timeout?: number;
    licenseKey?: string;
}

export interface PaxSaleRequest {
    amount: number; // in dollars
    invoiceNumber: string;
    referenceNumber?: string;
}

export interface PaxResponse {
    status: string;
    command: string;
    version: string;
    responseCode: string;
    responseMessage: string;
    hostInformation?: any;
    accountInformation?: any;
    traceInformation?: any;
    rawResponse?: any;
    // Extracted Fields
    transactionId?: string;
    authCode?: string;
    cardLast4?: string;
    cardType?: string;
}



export class PaxTerminal {
    private ip: string;
    private port: string;
    private timeout: number;
    private licenseKey?: string;

    private STX = { hex: 0x02, code: "02" };
    private FS = { hex: 0x1c, code: "1c" };
    private ETX = { hex: 0x03, code: "03" };
    private US = { hex: 0x1F, code: "1F" };

    constructor(config: PaxConfig) {
        this.ip = config.ip;
        this.port = config.port;
        this.timeout = config.timeout || 120000;
        this.licenseKey = config.licenseKey;
    }

    /**
     * Validate License with Backend
     */
    private async validateLicense(): Promise<void> {
        if (!this.licenseKey) {
            console.warn('[PAX] No license key provided, skipping validation (Development Mode)');
            return;
        }

        try {
            const res = await fetch('/api/license/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseKey: this.licenseKey,
                    terminalIp: this.ip
                    // TODO: Add terminalSerialNumber when we can fetch it from device
                })
            });

            const data = await res.json();

            if (!res.ok || !data.valid) {
                throw new Error(data.error || 'License validation failed');
            }

            console.log('[PAX] License validated successfully');
        } catch (error: any) {
            console.error('[PAX] License validation error:', error);
            throw new Error(`License Error: ${error.message}`);
        }
    }

    /**
     * Main method to process a Credit Sale (T00)
     */
    public async processSale(request: PaxSaleRequest): Promise<PaxResponse> {
        // 1. Validate License
        await this.validateLicense();

        const command = 'T00';
        const version = '1.28';
        const transactionType = '01'; // 01 = Sale

        // 1. Prepare Data Structures
        const amountInfo = {
            TransactionAmount: Math.round(request.amount * 100).toString(), // In cents
            TipAmount: '',
            CashBackAmount: '',
            MerchantFee: '',
            TaxAmount: '',
            FuelAmount: ''
        };

        const accountInfo = {
            Account: '',
            EXPD: '',
            CVVCode: '',
            EBTtype: '',
            VoucherNumber: '',
            Force: '',
            FirstName: '',
            LastName: '',
            CountryCode: '',
            State_ProvinceCode: '',
            CityName: '',
            EmailAddress: ''
        };

        const traceInfo = {
            ReferenceNumber: request.referenceNumber || '1',
            InvoiceNumber: request.invoiceNumber,
            AuthCode: '',
            TransactionNumber: '',
            TimeStamp: '',
            ECRTransID: ''
        };

        //Other info objects
        const avsInfo = {};
        const cashierInfo = {};
        const commercialInfo = {};
        const motoEcommerce = {};
        // CRITICAL FIX: Additional Info fields must be sent as "KEY=VALUE" strings!
        // The official PAX sample encodes them as name+"="+value.
        const additionalInfo = {
            TABLE: '',
            EDCTYPE: 'EDCTYPE=CREDIT' // ADDED: Try this to force online processing
        };

        console.log('[PAX] Building Request with:');
        console.log('  Amount:', request.amount);
        console.log('  Invoice:', request.invoiceNumber);
        console.log('  Reference:', request.referenceNumber || '1');
        console.log('  EDCTYPE: EDCTYPE=CREDIT (Trying to force Online)');
        console.log('  REPORTSTATUS: REPORTSTATUS=1 (Re-enabled)');

        // 2. Build Raw Params for LRC Calculation
        let rawParams: any[] = [this.STX.hex, command, this.FS.hex, version];

        rawParams.push(this.FS.hex);
        rawParams.push(transactionType);

        // Define explicit key orders
        const amountKeys = ['TransactionAmount', 'TipAmount', 'CashBackAmount', 'MerchantFee', 'TaxAmount', 'FuelAmount'];
        const accountKeys = ['Account', 'EXPD', 'CVVCode', 'EBTtype', 'VoucherNumber', 'Force', 'FirstName', 'LastName', 'CountryCode', 'State_ProvinceCode', 'CityName', 'EmailAddress'];
        const traceKeys = ['ReferenceNumber', 'InvoiceNumber', 'AuthCode', 'TransactionNumber', 'TimeStamp', 'ECRTransID'];
        const avsKeys = ['ZipCode', 'Address', 'Address2'];
        const cashierKeys = ['ClerkID', 'ShiftID'];
        const commercialKeys = ['PONumber', 'CustomerCode', 'TaxExempt', 'TaxExemptID', 'MerchantTaxID', 'DestinationZipCode', 'ProductDescription'];
        const motoKeys = ['OrderNumber', 'Installments', 'CurrentInstallment'];
        const additionalKeys = ['TABLE', 'GUEST', 'SIGN', 'TICKET', 'HREF', 'TIPREQ', 'SIGNUPLOAD', 'REPORTSTATUS', 'TOKENREQUEST', 'TOKEN', 'CARD TYPE', 'CARDTYPEBITMAP', 'PASSTHRUDATA', 'RETURNREASON', 'ORIG', 'TRANSDAITE', 'ORIGPAN', 'ORIGEXPIRYDATE', 'ORIGTRANSTIME', 'DISPROGPROMPTS', 'GATEWAYID', 'GETSIGN'];

        rawParams.push(this.FS.hex);
        rawParams = this.appendRawParams(rawParams, amountInfo, amountKeys);

        rawParams.push(this.FS.hex);
        rawParams = this.appendRawParams(rawParams, accountInfo, accountKeys);

        rawParams.push(this.FS.hex);
        rawParams = this.appendRawParams(rawParams, traceInfo, traceKeys);

        rawParams.push(this.FS.hex);
        rawParams = this.appendRawParams(rawParams, avsInfo, avsKeys);

        rawParams.push(this.FS.hex);
        rawParams = this.appendRawParams(rawParams, cashierInfo, cashierKeys);

        rawParams.push(this.FS.hex);
        rawParams = this.appendRawParams(rawParams, commercialInfo, commercialKeys);

        rawParams.push(this.FS.hex);
        rawParams = this.appendRawParams(rawParams, motoEcommerce, motoKeys);

        rawParams.push(this.FS.hex);
        rawParams = this.appendRawParams(rawParams, additionalInfo, additionalKeys);

        rawParams.push(this.ETX.hex);

        // 3. Calculate LRC
        const lrc = this.calculateLRC(rawParams);

        // 4. Build Encoded Elements
        let elements: string[] = [this.STX.code];

        elements.push(this.encodeString(command));
        elements.push(this.FS.code);
        elements.push(this.encodeString(version));
        elements.push(this.FS.code);
        elements.push(this.encodeString(transactionType));
        elements.push(this.FS.code);

        elements = this.appendEncodedParams(elements, amountInfo, amountKeys);
        elements.push(this.FS.code);
        elements = this.appendEncodedParams(elements, accountInfo, accountKeys);
        elements.push(this.FS.code);
        elements = this.appendEncodedParams(elements, traceInfo, traceKeys);
        elements.push(this.FS.code);
        elements = this.appendEncodedParams(elements, avsInfo, avsKeys);
        elements.push(this.FS.code);
        elements = this.appendEncodedParams(elements, cashierInfo, cashierKeys);
        elements.push(this.FS.code);
        elements = this.appendEncodedParams(elements, commercialInfo, commercialKeys);
        elements.push(this.FS.code);
        elements = this.appendEncodedParams(elements, motoEcommerce, motoKeys);
        elements.push(this.FS.code);
        elements = this.appendEncodedParams(elements, additionalInfo, additionalKeys);

        elements.push(this.ETX.code);
        elements.push(this.encodeString(String.fromCharCode(lrc)));

        // 5. Final Encoding
        const finalString = elements.join(" ");
        const finalBase64 = this.hexToBase64(finalString);

        console.log('[PAX] Sending Request via Proxy');
        console.log('[PAX] Payload:', finalBase64);

        // 6. Send Request via Proxy
        try {
            const response = await fetch('/api/pax/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ip: this.ip,
                    port: this.port,
                    payload: finalBase64,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Proxy request failed');
            }

            console.log('[PAX] Raw Response:', data.response);
            return this.parseResponse(data.response);
        } catch (error) {
            console.error('[PAX] Error:', error);
            throw new Error('Failed to communicate with PAX terminal');
        }
    }

    // --- Helper Methods ---

    private calculateLRC(params: any[]): number {
        let lrc = 0;
        for (let i = 1; i < params.length; i++) { // Skip STX (index 0)
            const val = params[i];
            if (typeof val === 'string') {
                for (let j = 0; j < val.length; j++) {
                    lrc ^= val.charCodeAt(j);
                }
            } else {
                lrc ^= val;
            }
        }
        return lrc;
    }

    private appendRawParams(arr: any[], obj: any, keys: string[]): any[] {
        if (keys.length === 0) return arr;

        for (const key of keys) {
            const val = obj[key];
            if (val !== undefined && val !== '') {
                arr.push(val.toString());
            }
            arr.push(this.US.hex);
        }
        arr.pop(); // Remove last US
        return arr;
    }

    private appendEncodedParams(arr: string[], obj: any, keys: string[]): string[] {
        if (keys.length === 0) return arr;

        for (const key of keys) {
            const val = obj[key];
            if (val !== undefined && val !== '') {
                arr.push(this.encodeString(val.toString()));
            }
            arr.push(this.US.code);
        }
        arr.pop(); // Remove last US
        return arr;
    }

    private encodeString(str: string): string {
        // String -> Base64 -> Hex
        const b64 = btoa(str);
        return this.base64ToHex(b64);
    }

    private base64ToHex(str: string): string {
        const bin = atob(str);
        const hex: string[] = [];
        for (let i = 0; i < bin.length; i++) {
            let tmp = bin.charCodeAt(i).toString(16);
            if (tmp.length === 1) tmp = "0" + tmp;
            hex.push(tmp);
        }
        return hex.join(" ");
    }

    private base64ToHexSpace(str: string): string {
        const bin = atob(str);
        const hex: string[] = [];
        for (let i = 0; i < bin.length; i++) {
            let tmp = bin.charCodeAt(i).toString(16);
            if (tmp.length === 1) tmp = "0" + tmp;
            hex.push(tmp);
        }
        return hex.join(" ");
    }

    private hexToBase64(str: string): string {
        const cleanStr = str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "");
        const hexArr = cleanStr.split(" ");
        let binString = "";
        for (let i = 0; i < hexArr.length; i++) {
            if (hexArr[i]) {
                binString += String.fromCharCode(parseInt(hexArr[i], 16));
            }
        }
        return btoa(binString);
    }

    private parseResponse(response: string): PaxResponse {
        const decodedBin = atob(response);
        const parts = decodedBin.split(String.fromCharCode(0x1c));
        const cleanParts = parts.map(p => p.replace(/\x02/g, '').replace(/\x03/g, ''));

        // Host Information (Index 5)
        const hostInfo = cleanParts[5] ? cleanParts[5].split(String.fromCharCode(0x1f)) : [];
        const authCode = hostInfo[2] || '';
        const transactionId = hostInfo[3] || '';

        // Account Information (Index 8)
        const accountInfo = cleanParts[8] ? cleanParts[8].split(String.fromCharCode(0x1f)) : [];
        const accountNumber = accountInfo[0] || '';
        const cardLast4 = accountNumber.slice(-4);
        const cardType = accountInfo[6] || '';

        const parsedResponse = {
            status: cleanParts[0] || '',
            command: cleanParts[1] || '',
            version: cleanParts[2] || '',
            responseCode: cleanParts[3] || '',
            responseMessage: cleanParts[4] || '',
            transactionId,
            authCode,
            cardLast4,
            cardType,
            rawResponse: cleanParts
        };

        // DETAILED LOGGING FOR DEBUGGING
        console.log('========== PAX RESPONSE DETAILS ==========');
        console.log('Status:', parsedResponse.status);
        console.log('Command:', parsedResponse.command);
        console.log('Version:', parsedResponse.version);
        console.log('Response Code:', parsedResponse.responseCode);
        console.log('Response Message:', parsedResponse.responseMessage);
        console.log('Transaction ID:', parsedResponse.transactionId);
        console.log('Auth Code:', parsedResponse.authCode);
        console.log('Card Last 4:', parsedResponse.cardLast4);
        console.log('Card Type:', parsedResponse.cardType);
        console.log('\n--- RAW RESPONSE PARTS ---');
        cleanParts.forEach((part, idx) => {
            console.log(`Part ${idx}:`, part);
            if (idx === 5) {
                console.log('  → Host Info Fields:', hostInfo);
            }
            if (idx === 8) {
                console.log('  → Account Info Fields:', accountInfo);
            }
        });
        console.log('==========================================');

        return parsedResponse;
    }
}
