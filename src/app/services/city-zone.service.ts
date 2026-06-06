import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CityZone } from '../interfaces/cityZone';

@Injectable({
  providedIn: 'root'
})
export class CityZoneService {

  apiUrl = `${environment.api}/city-zone`;

  private http = inject(HttpClient);

  findAllStateCity(data:any): Observable<object[]> {

    return this.http.post<CityZone[]>(this.apiUrl + '/city', data);
  }
}
