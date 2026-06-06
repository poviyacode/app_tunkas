import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ZegoCloudService {

  isBrowser: boolean;

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  generateToken(data: { roomID: string; userID: string }) {
    return this.http.post<{ token: string }>(`${environment.api}/zegocloud/generateToken`, data);
  }

  generateToken2(data: { roomID: string; userID: string, esTransmisor: boolean }) {
    return this.http.post<{ token: string }>(`${environment.api}/zegocloud/generateToken2`, data);
  }

}
