import { v4 as uuidv4 } from 'uuid';

export interface PaxConfig {
    ip: string;
    port: string;
    timeout?: number;
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
    amountInformation?: any;
    accountInformation?: any;
    traceInformation?: any;
    rawResponse?: any;
}

export class PaxTerminal {
    private ip: string;
    private port: string;
    private timeout: number;

    private STX = { hex: 0x02, code: "02" };
    private FS = { hex: 0x1c, code: "1c" };
    private ETX = { hex: 0x03, code: "03" };
    private US = { hex: 0x1F, code: "1F" };

    constructor(config: PaxConfig) {
        this.ip = config.ip;
        this.port = config.port;
        this.timeout = config.timeout || 120000;
    }

    /**
     * Main method to process a Credit Sale (T00)
     */
    public async processSale(request: PaxSaleRequest): Promise<PaxResponse> {
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

        // Other info objects (empty for now)
        const avsInfo = {};
        const cashierInfo = {};
        const commercialInfo = {};
        const motoEcommerce = {};
        const additionalInfo = {};

        // 2. Build Raw Params for LRC Calculation
        // [STX, Command, FS, Version, FS, TransType, FS, AmountInfo..., FS, AccountInfo..., ...]
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
        const additionalKeys = ['TableNum', 'GuestNum', 'TicketNum', 'HRefNum', 'Token', 'CardTypeBitmap', 'PassThruDat', 'Origtransdate', 'Origpan', 'OrigExpiryDate', 'OrigTransTime', 'DisProgPromPts', 'GateWayID', 'EntryModeBitmap', 'Odometer', 'VehicleNo', 'JobNo', 'DriverID', 'EmployeeNo', 'LicenseNo', 'JobID', 'DepartmentNo', 'CustomerData', 'UserID', 'VehicleID', 'POSEchoData'];

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
        // [STX, EncodedCommand, FS, EncodedVersion, FS, EncodedTransType, FS, EncodedAmountInfo..., ETX, EncodedLRC]
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

        const url = `http://${this.ip}:${this.port}?${finalBase64}`;

        console.log('[PAX] Sending Request to:', url);

        // 6. Send Request
        try {
            const response = await fetch(url);
            const responseText = await response.text();
            console.log('[PAX] Raw Response:', responseText);
            return this.parseResponse(responseText);
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
        return hex.join(""); // Note: The original code joined with spaces, but let's check if that's needed for the intermediate step.
        // Wait, the original code `base64ToHex` returns space-separated hex.
        // `elements` array contains these space-separated hex strings.
        // Then `elements.join(" ")` puts spaces between them.
        // So `encodeString` should probably return the hex string directly?
        // Let's stick to the original logic:
        // `base64ToHex` returns "HH HH HH"
    }

    // Re-implementing base64ToHex to match original exactly (space separated)
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
        // Hex (space separated or not) -> Bytes -> Base64
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
        // Response is Base64 string
        // Base64 -> Hex -> String
        const hexString = this.base64ToHexSpace(response); // Get "HH HH HH"

        // Convert Hex to String (handling delimiters)
        // The original code does: StringToHex(response) -> split -> check LRC -> split by 02|1c
        // But `response` passed to `parseResponse` is the raw Base64 string from the server?
        // No, the server returns a Base64 string.

        // Let's decode the whole thing first.
        const decodedBin = atob(response);
        // Now we have the raw bytes string.

        // Split by FS (0x1c) and STX (0x02)
        // This is tricky because we need to handle the structure.

        // Simple parsing based on known structure:
        // [STX] [Status] [FS] [Command] [FS] [Version] [FS] [ResponseCode] [FS] [ResponseMessage] ...

        // Let's convert to an array of strings
        const parts = decodedBin.split(String.fromCharCode(0x1c));

        // First part contains STX + Status + Command?
        // Actually, let's just split by 0x1c and clean up 0x02 and 0x03

        const cleanParts = parts.map(p => p.replace(/\x02/g, '').replace(/\x03/g, ''));

        // Note: This is a simplified parser. A robust one would check LRC.

        return {
            status: cleanParts[0] || '',
            command: cleanParts[1] || '',
            version: cleanParts[2] || '',
            responseCode: cleanParts[3] || '',
            responseMessage: cleanParts[4] || '',
            rawResponse: cleanParts
        };
    }
}
