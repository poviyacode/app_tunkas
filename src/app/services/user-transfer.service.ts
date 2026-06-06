import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ToolsService } from './tools.service';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from '../../environments/environment';
import { Headers } from '../core/common/http-headers';
import { AuthService } from './auth.service';
import { UserTransfer } from '@interfaces/userTransfer';
import { CreditCalculator } from '@interfaces/transactionCredit';

export interface resFindAllUser {
  UserTransfer: UserTransfer[],
  CreditCalculator: CreditCalculator,
};

@Injectable({
  providedIn: 'root'
})
export class UserTransferService {

  daymentMethod: UserTransfer[];

  apiUrl = `${environment.api}/user-transfer`;

  private http = inject(HttpClient);

  create(data: any): Observable<UserTransfer> {
    return this.http.post<UserTransfer>(this.apiUrl + '/create', data, Headers.HttpOptions());
  }

  update(id: string, data: any): Observable<UserTransfer> {
    return this.http.patch<UserTransfer>(this.apiUrl + '/update/' + id, data, Headers.HttpOptions());
  }

  findAllUser(): Observable<resFindAllUser> {
    return this.http.get<resFindAllUser>(this.apiUrl + '/user', Headers.HttpOptions());
  }

  //-- save user transfer
  public userTransfer = signal<UserTransfer | null>(null);

  addUserTransfer(value: UserTransfer) {
    this.userTransfer.set(value);
  }

  resetUserTransfer() {
    this.userTransfer.set(null);
  }

  //-- save user transfers
  readonly userTransfers = signal<UserTransfer[]>(this.loadFromStorage<UserTransfer[]>('userTransfers', []));

  addUserTransfers(updatedPosts: UserTransfer[]) {
    this.saveToStorage('userTransfers', updatedPosts);
    this.userTransfers.set(updatedPosts);
  }

  updateUserTransfers(id: string, updates: Partial<UserTransfer>) {
    const current = this.loadFromStorage<UserTransfer[]>('userTransfers', []);
    const updated = current.map(item =>
      item._id === id ? { ...item, ...updates } : item
    );

    this.userTransfers.set(updated);
    this.saveToStorage('userTransfers', updated);
  }

  removeUserTransfers(postId: string) {
    const currentPosts = this.loadFromStorage<UserTransfer[]>('userTransfers', [])
    const updatedPosts = currentPosts.filter(post => post._id !== postId);
    this.saveToStorage('userTransfers', updatedPosts);
    this.userTransfers.set(updatedPosts);
  }

  resetUserTransfers() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('userTransfers');
    }
    this.userTransfers.set([]);
  }

  //--- storage
  public loadFromStorage<T>(storageKey: string, defaultValue: T): T {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storedData = localStorage.getItem(storageKey);
      return storedData ? JSON.parse(storedData) as T : defaultValue;
    }
    return defaultValue;
  }

  public saveToStorage<T>(storageKey: string, data: T): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }
}
