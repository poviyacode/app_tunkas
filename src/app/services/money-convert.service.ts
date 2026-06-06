import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ResponseApi } from '@interfaces/responseApi';
import { Money } from '@interfaces/money';

@Injectable({
  providedIn: 'root'
})
export class MoneyConvertService {

  apiUrl = `${environment.api}/money-convert`;

  private http = inject(HttpClient);

  findOne(id: any): Observable<ResponseApi> {
    return this.http
      .get<ResponseApi>(this.apiUrl +  '/' + id)
      .pipe(retry(1), catchError(this.handleError));
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
    //window.alert(errorMessage);
    return throwError(() => {
      return errorMessage;
    });
  }
}
