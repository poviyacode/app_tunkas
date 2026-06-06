import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CloudflareCallsService {

  private apiUrl = `${ environment.api}/cloudflare`;

  constructor(private http: HttpClient) {}

  createSession(offerSDP: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/session`, { offerSDP });
  }

  addTracks(sessionId: string, tracks: any, offerSDP: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/tracks`, { sessionId, tracks, offerSDP });
  }

  renegotiateSession(sessionId: string, answerSDP: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/renegotiate`, { sessionId, answerSDP });
  }
}
