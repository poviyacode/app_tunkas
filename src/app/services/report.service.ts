import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Headers } from '../core/common/http-headers';

@Injectable({
  providedIn: 'root'
})
export class RepostService {

  apiUrl = `${environment.api}/report`;

  private http = inject(HttpClient);

  create(data: any): Observable<Report> {
    return this.http.post<Report>(this.apiUrl + '/', data, Headers.HttpOptions());
  }

}
