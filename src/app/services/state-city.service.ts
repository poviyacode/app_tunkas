import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { lastValueFrom, Observable, throwError } from 'rxjs';
import { retry, catchError, delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { StateCity } from '../interfaces/stateCity';

@Injectable({
  providedIn: 'root'
})
export class StateCityService {

  apiUrl = `${environment.api}/state-city`;

  private http = inject(HttpClient);

  findOne(id: any): Observable<StateCity> {
    return this.http
      .get<StateCity>(this.apiUrl + '/' + id)
      .pipe(retry(1), catchError(this.handleError));
  }

  findAllCountry(dataQuery: any): Observable<object[]> {
    return this.http.post<StateCity[]>(this.apiUrl + '/country', dataQuery);
  }

  findAllCountryState(IdCountryState: string): Promise<object[]> {
    return lastValueFrom(this.http.get<StateCity[]>(`${this.apiUrl}/findAllCountryState/${IdCountryState}`));
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
