import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { lastValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CountryState } from '../interfaces/countryState';

@Injectable({
  providedIn: 'root'
})
export class CountryStateService {

  apiUrl = `${environment.api}/country-state`;

  private http = inject(HttpClient);


  findAllCountry(data: any): Promise<CountryState[]> {
    return lastValueFrom(this.http.post<CountryState[]>(this.apiUrl + '/country', data));
  }

  findAllSearchCode(data: any): Promise<CountryState[]> {
    return lastValueFrom(this.http.post<CountryState[]>(this.apiUrl + '/search-code', data));
  }
}
