import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UAParser } from 'ua-parser-js';

@Injectable({
    providedIn: 'root',
})
export class BrowserIdService {
    private fingerprint: string | null = null;
    private http = inject(HttpClient);

    async getBrowserId(): Promise<string> {
        if (this.fingerprint) {
            return this.fingerprint;
        }

        const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        this.fingerprint = result.visitorId; // ID único generado por FingerprintJS
        return this.fingerprint;
    }

    async getIpAddress(): Promise<string> {
        try {
            const response = await this.http.get<{ ip: string }>('https://api64.ipify.org?format=json').toPromise();
            return response?.ip || 'unknown';
        } catch (error) {
            console.error('Error fetching IP address:', error);
            return 'unknown';
        }
    }

    getDeviceInfo() {
        const parser = new UAParser();
        const browser = parser.getBrowser().name || 'unknown';
        const os = parser.getOS().name || 'unknown';
        const deviceType = parser.getDevice().type || 'desktop'; // 'mobile', 'tablet', 'desktop'

        return {
            browser,
            os,
            deviceType,
        };
    }

    async getFullDeviceInfo(): Promise<any> {
        const browserId = await this.getBrowserId();
        const ipAddress = await this.getIpAddress();
        const deviceInfo = this.getDeviceInfo();

        return {
            browserId,
            ipAddress,
            ...deviceInfo,
        };
    }
}