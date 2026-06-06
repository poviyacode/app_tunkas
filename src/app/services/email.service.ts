import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { environment } from '@environments/environment';
import { delay, lastValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  private doc = 'mail';
  api2Url = `${environment.api2}/mail`;

  private firestore = inject(Firestore);
  private http = inject(HttpClient);

  async create(data: any) {
    const docRef = await addDoc(collection(this.firestore, `${this.doc}`), data);
    return docRef;
  }

  sendMail(data: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.api2Url, data)
    );
  }

  sendMailBulk(data: any): Promise<any> {
    return lastValueFrom(this.http.post<any[]>(this.api2Url + '/bulk', data));
  }

}
