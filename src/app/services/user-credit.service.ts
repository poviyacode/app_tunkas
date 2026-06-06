import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ToolsService } from './tools.service';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from '../../environments/environment';
import { Headers } from '../core/common/http-headers';
import { AuthService } from './auth.service';
import { CreditValueBuy, UserCredit } from '@interfaces/userCredit';

@Injectable({
  providedIn: 'root'
})
export class UserCreditService {

  apiUrl = `${environment.api}/user-credit`;

  private http = inject(HttpClient);
  private toolsService = inject(ToolsService);
  private authService = inject(AuthService);

  create(data: any): Observable<UserCredit> {

    return this.http.post<UserCredit>(this.apiUrl + '/', data, Headers.HttpOptions());
  }

  findOneUser(): Observable<UserCredit> {
    return this.http.get<UserCredit>(this.apiUrl + '/find-one-user', Headers.HttpOptions());
  }
  
  creditValueTransfer(): Observable<number> {
    return this.http.get<number>(this.apiUrl + '/creditValueTransfer');
  }

  creditValueBuy(): Observable<CreditValueBuy> {
    return this.http.get<CreditValueBuy>(this.apiUrl + '/creditValueBuy');
  }

  userCreditData: UserCredit;
  get credit() {
    return this.userCreditData;
  }

  async getUserCreditCurrentLocal(): Promise<UserCredit> {

    try {
      const res = await this.findOneUser().toPromise();
      return res!;
    } catch (error) {
      console.error(error);
      throw error;
    }

    // let userCreditData = JSON.parse(localStorage.getItem('user_credit')!);
    // if (userCreditData) {
    //   return userCreditData;
    // } else {
    //   try {
    //     const res = await this.findOneUser().toPromise();
    //     localStorage.setItem('user_credit', JSON.stringify(res));
    //     return res!;
    //   } catch (error) {
    //     console.error(error);
    //     throw error;
    //   }
    // }
  }

  async clearUserCredit() {
    try {
      localStorage.removeItem('user_credit');
      const res = await this.getUserCreditCurrentLocal();
      this.userCreditData = res;
      return res!;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  //-- save user credit
  public userCredit = signal<UserCredit | null>(null);

  addUserCredit(value: UserCredit) {
    this.userCredit.set(value);
  }

  resetUserCredit() {
    this.userCredit.set(null);
  }
}
