import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Headers } from '../core/common/http-headers';
import { ProductAdCredit } from '@interfaces/productAdCredit';

@Injectable({
  providedIn: 'root'
})
export class ProductAdCreditService {

  apiUrl = `${environment.api}/product-ad-credit`;

  private http = inject(HttpClient);

  findAll(): Observable<ProductAdCredit[]> {
    return this.http.get<ProductAdCredit[]>(this.apiUrl +  '/', Headers.HttpOptions());
  }

  findAllPostCredit(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl +  '/find-all-post-credit', data, Headers.HttpOptions());
  }

}
