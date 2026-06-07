import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { delay, lastValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  private doc = 'mail';
  api2Url = `${environment.api2}/mail`;

  private http = inject(HttpClient);

  sendMail(data: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.api2Url, data)
    );
  }

  sendMailBulk(data: any): Promise<any> {
    return lastValueFrom(this.http.post<any[]>(this.api2Url + '/bulk', data));
  }

}
