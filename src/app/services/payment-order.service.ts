import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaymentOrder } from '../interfaces/paymentOrder';
import { Headers } from '../core/common/http-headers';
import { ResponseApi } from '@interfaces/responseApi';

@Injectable({
  providedIn: 'root'
})
export class PaymentOrderService {

  apiUrl = `${environment.api}/payment-order`;

  private http = inject(HttpClient);

  createPaymentOrder(data: any): Observable<PaymentOrder> {
    data.Site = environment.site;
    return this.http.post<PaymentOrder>(this.apiUrl +  '/createPaymentOrder', data,  Headers.HttpOptions());
  }

  findOneCode(id: string): Observable<ResponseApi> {

    return this.http.get<ResponseApi>(this.apiUrl +  '/code/' + id,);
  }

}
