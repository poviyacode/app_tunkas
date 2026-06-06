import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Headers } from '../core/common/http-headers';
import { Membership } from '@interfaces/membership';
import { ResponseApi } from '@interfaces/responseApi';

@Injectable({
  providedIn: 'root'
})
export class MembershipService {

  apiUrl = `${environment.api}/membership`;

  private http = inject(HttpClient);

  create(data: any): Observable<Membership[]> {
    return this.http.post<Membership[]>(this.apiUrl + '/', data, Headers.HttpOptions());
  }

  updateMembership(data: any): Observable<Membership> {
    return this.http.post<Membership>(this.apiUrl + '/updateMembership', data, Headers.HttpOptions());
  }

  findAllUser(data: any): Observable<object[]> {
    return this.http.post<Membership[]>(this.apiUrl + '/findAllUser', data, Headers.HttpOptions());
  }

  findAllUserJoin(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/find-all-user-join', data, Headers.HttpOptions());
  }

  updateDiscount(data: any): Observable<Membership> {
    return this.http.post<Membership>(this.apiUrl + '/updateDiscount', data, Headers.HttpOptions());
  }

  findAll(): Observable<ResponseApi> {
    return this.http.get<ResponseApi>(this.apiUrl);
  }

  findAllCities(): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/country-cities');
  }

  delete(id: any): Observable<any> {
    return this.http.delete<any>(this.apiUrl + '/' + id);
  }

  //-- save memberships
  readonly memberships = signal<Membership[]>(this.loadFromStorage<Membership[]>('memberships', []));

  addMemberships(updatedMemberships: Membership[]) {
    this.saveToStorage('memberships', updatedMemberships);
    this.memberships.set(updatedMemberships);
  }

  updateMemberships(id: string, updates: Partial<Membership>) {
    const current = this.loadFromStorage<Membership[]>('memberships', []);
    const updated = current.map(item =>
      item._id === id ? { ...item, ...updates } : item
    );
    this.memberships.set(updated);
    this.saveToStorage('memberships', updated);
  }

  removeMemberships(postId: string) {
    const currentPosts = this.loadFromStorage<Membership[]>('memberships', [])
    const updatedMemberships = currentPosts.filter(post => post._id !== postId);
    this.saveToStorage('memberships', updatedMemberships);
    this.memberships.set(updatedMemberships);
  }

  resetMemberships() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('memberships');
    }
    this.memberships.set([]);
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
