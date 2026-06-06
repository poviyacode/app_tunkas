import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { retry, catchError, delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { StateCity } from '../interfaces/stateCity';

@Injectable({
  providedIn: 'root'
})
export class TelegramService {

  apiUrl = `${environment.api}/social-telegram`;

  private http = inject(HttpClient);

  sendMessage(dataQuery: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/send_message', dataQuery);
  }

  sendMessageMedia(dataQuery: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/send_message_media', dataQuery);
  }

  sendLastedPost(id: any, offset: number): Observable<any> {
    const data: any = {};
    return this.http.patch<any>(this.apiUrl + `/send-lasted-post/${id}?offset=${offset}`, data)
      ;
  }

  // MANEJADOR DE ERROR
  handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Get client-side error
      errorMessage = error.error.message;
    } else {
      // Get server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    window.alert(errorMessage);
    return throwError(() => {
      return errorMessage;
    });
  }
}
