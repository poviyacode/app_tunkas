import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay } from 'rxjs';
import { environment } from '../../environments/environment';
import { Headers } from '../core/common/http-headers';
import { Cam } from '@interfaces/cam';

@Injectable({
  providedIn: 'root'
})
export class CamService {

  apiUrl = `${environment.api}/cam`;

  private http = inject(HttpClient);

  create(data: any): Observable<Cam> {
    return this.http.post<Cam>(this.apiUrl, data, Headers.HttpOptions());
  }

  update(id: string, data: any): Observable<Cam> {
    const uri = this.apiUrl + '/' + id;
    return this.http.patch<Cam>(uri, data, Headers.HttpOptions());
  }

  findOneUser(userId: string): Observable<Cam> {
    return this.http.get<Cam>(this.apiUrl + '/user/' + userId, Headers.HttpOptions());
  }

  //------------------ cam active
  findAllActive(data: any, limit: number, offset: number): Observable<any> {

    //offset = 1;
    return this.http.post<any>(this.apiUrl + `/active?limit=${limit}&offset=${offset}`, data)
      ;
  }

  findAllActiveInfinite(data: any, limit: number, offset: number): Observable<any> {
    //offset = 1;
    return this.http.post<any>(this.apiUrl + `/active-infinite?limit=${limit}&offset=${offset}`, data)
      ;
  }
  //------------------- end cam active

  findOneRoom(roomID: string): Observable<Cam> {
    //data.Site = environment.site;

    return this.http.get<Cam>(this.apiUrl + '/room/' + roomID, Headers.HttpOptions());
  }
}
