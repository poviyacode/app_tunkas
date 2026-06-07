import { HttpClient } from "@angular/common/http";
import { Injectable, signal, inject, Injector } from "@angular/core";
import { BehaviorSubject, catchError, delay, from, lastValueFrom, map, Observable, retry, tap, throwError } from "rxjs";
import { environment } from "../../environments/environment";
import { Headers } from '../core/common/http-headers';
import { ErrorHandlerService } from "./errorHandler.service";
import { Router } from "@angular/router";
import { User, UserCurrent, UserRole, UserVideoCallRequest } from "@interfaces/user";
import { StorageService } from "./storage.service";
import { ResponseApi } from "@interfaces/responseApi";
import { AuthService } from "./auth.service";
import { UserCreditService } from "./user-credit.service";
import { SubscriptionService } from "./subscription.service";
import { TransactionCreditService } from "./transaction-credit.service";

@Injectable({
  providedIn: 'root'
})
export class UserService {

  apiUrl = `${environment.api}/user`;

  private http = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);
  private router = inject(Router);
  private storageService = inject(StorageService);
  private injector = inject(Injector);

  profile(data: any): Observable<any> {

    return this.http.post<any[]>(this.apiUrl + '/createProfile', data, Headers.HttpOptions());
  }

  createPersonal(data: any): Observable<any> {
    return this.http.post<any[]>(this.apiUrl + '/createPersonal', data, Headers.HttpOptions())
      ;
  }

  update(data: any): Observable<User> {
    return this.http.post<User>(this.apiUrl + '/update', data, Headers.HttpOptions())
      ;
  }

  updateRoles(id: string, data: any): Observable<User> {
    return this.http.patch<User>(this.apiUrl + '/roles/' + id, data, Headers.HttpOptions())
      ;
  }

  verifiedAccount(data: any): Observable<User> {
    return this.http.post<User>(this.apiUrl + '/verifiedAccount', data, Headers.HttpOptions())
      ;
  }

  verifyEmail(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/verifyEmail', data, Headers.HttpOptions())
      ;
  }

  slug(data: any) {
    data.Site = environment.site;
    return this.http.post<any>(this.apiUrl + '/slug', data)
      ;
  }

  updateUsername(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/updateUsername', data, Headers.HttpOptions())
      ;
  }

  updateEmail(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/updateEmail', data, Headers.HttpOptions())
      ;
  }

  findOne(id: any): Observable<User> {
    return this.http
      .get<User>(this.apiUrl + '/' + id)
      ;
  }

  findOneCurrent(id: string): Promise<UserCurrent> {
    return lastValueFrom(
      this.http.get<UserCurrent>(`${this.apiUrl}/findOneCurrent/${id}`)
    );
  }

  findOneCamRom(id: any): Observable<User> {
    return this.http
      .get<User>(this.apiUrl + '/camRomId/' + id)
      ;
  }

  userProfiles(data: any, limit: number, offset: number): Observable<ResponseApi> {
    data.Site = environment.site;
    return this.http.post<ResponseApi>(this.apiUrl + `/userProfiles?limit=${limit}&offset=${offset}`, data)
      ;
  }

  searchUsers(data: any, limit: number, offset: number): Observable<ResponseApi> {
    data.Site = environment.site;
    return this.http.post<ResponseApi>(this.apiUrl + `/searchUsers?limit=${limit}&offset=${offset}`, data)
      ;
  }

  // suggested users
  findSuggestedUsers(data: any): Observable<any> {
    data.Site = environment.site;
    return this.http.post<any>(this.apiUrl + '/usersSuggestion', data)
      ;
  }

  readonly suggestedUsers = signal<User[]>(this.storageService.loadFromStorage<User[]>('suggestedUsers', []));

  addSuggestedUsers(value: User[]) {
    this.storageService.saveToStorage('suggestedUsers', value);
    this.suggestedUsers.set(value);
  }

  //--- find live
  findUsersLive(data: any, limit: number, offset: number): Observable<any> {
    data.Site = environment.site;
    return this.http.post<any>(this.apiUrl + `/findUsersLive?limit=${limit}&offset=${offset}`, data, Headers.HttpOptions())
      ;
  }

  //--- find online
  findUsersOnline(data: any, limit: number, offset: number): Observable<any> {
    data.Site = environment.site;
    return this.http.post<any>(this.apiUrl + `/findUsersOnline?limit=${limit}&offset=${offset}`, data, Headers.HttpOptions())
      ;
  }

  //find explore
  findAllUsersExplore(data: any, limit: number, offset: number): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/findAllUsersExplore?limit=${limit}&offset=${offset}`, data, Headers.HttpOptions())
      ;
  }

  //  find one personal
  findOnePersonal(id: any): Observable<User> {
    return this.http.get<User>(this.apiUrl + '/personal/' + id);
  }

  //  find all marketing
  findAllEmailMarketing(data: any): Observable<User[]> {
    return this.http.post<User[]>(this.apiUrl + `/findAllEmailMarketing`, data, Headers.HttpOptions())
      ;
  }

  //--- signals
  public readonly userProfile = signal<User | null>(this.storageService.loadFromStorage<User | null>('userProfile', null));

  addUserProfile(value: User) {
    this.storageService.saveToStorage('userProfile', value);
    this.userProfile.set(value);
  }

  updateUserProfile(updates: Partial<User>) {
    const currentUser = this.userProfile();
    if (!currentUser) return; // Si no hay usuario, salir

    // Combinar los cambios con el usuario actual
    const updatedUser = {
      ...currentUser,
      ...updates
    };

    // Actualizar la signal y el almacenamiento
    this.userProfile.set(updatedUser);
    this.storageService.saveToStorage('userProfile', updatedUser);
  }

  resetUserProfile() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('userProfile');
    }
    this.userProfile.set(null);
  }

  //-- save users online 
  // 1. Mantenemos el estado únicamente en memoria RAM. Inicializa vacío [].
  readonly usersOnline = signal<User[]>([]);

  // Reemplaza o añade la lista completa (Ideal para cuando responde 'initial_online_users')
  addUsersOnline(updatedItems: User[]) {
    this.usersOnline.set(updatedItems);
  }

  // Actualiza las propiedades de un usuario si ya existe, o lo añade si es nuevo
  updateUsersOnline(id: string, updates: Partial<User>) {
    this.usersOnline.update(currentUsers => {
      const userExists = currentUsers.some(item => item._id === id);

      if (userExists) {
        // Si ya existe, mutamos solo ese elemento de forma inmutable
        return currentUsers.map(item =>
          item._id === id ? { ...item, ...updates } : item
        );
      } else {
        // Opcional: Si el usuario no estaba en la lista pero llega un update (se conectó),
        // lo casteamos y lo agregamos al inicio de la lista.
        const newUser = { _id: id, ...updates } as User;
        return [newUser, ...currentUsers];
      }
    });
  }

  // Remueve un usuario (Ideal para cuando se desconecta)
  removeUsersOnline(userId: string) {
    this.usersOnline.update(currentUsers =>
      currentUsers.filter(user => user._id !== userId)
    );
  }

  // Limpia la lista por completo (Por ejemplo, al hacer Logout)
  resetUsersOnline() {
    this.usersOnline.set([]);
  }

  //-- save users live
  readonly usersLive = signal<User[]>(this.storageService.loadFromStorage<User[]>('usersLive', []));

  addUsersLive(updatedItems: User[]) {
    this.storageService.saveToStorage('usersLive', updatedItems);
    this.usersLive.set(updatedItems);
  }

  updateUsersLive(id: string, updates: Partial<User>) {
    const current = this.storageService.loadFromStorage<User[]>('usersLive', []);
    const updated = current.map(item =>
      item._id === id ? { ...item, ...updates } : item
    );

    this.usersLive.set(updated);
    this.storageService.saveToStorage('usersLive', updated);
  }

  removeUsersLive(postId: string) {
    const currentPosts = this.storageService.loadFromStorage<User[]>('usersLive', [])
    const updatedPosts = currentPosts.filter(post => post._id !== postId);
    this.storageService.saveToStorage('usersLive', updatedPosts);
    this.usersLive.set(updatedPosts);
  }

  resetUsersLive() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('usersLive');
    }
    this.usersLive.set([]);
  }

  //--- user request
  public readonly userVideoCallRequest = signal<UserVideoCallRequest | null>(this.storageService.loadFromStorage<UserVideoCallRequest | null>('userVideoCallRequest', null));

  addUserVideoCallRequest(value: UserVideoCallRequest) {
    this.storageService.saveToStorage('userVideoCallRequest', value);
    this.userVideoCallRequest.set(value);
  }

  updateUserVideoCallRequest(updates: Partial<UserVideoCallRequest>) {
    const currentUser = this.userVideoCallRequest();
    if (!currentUser) return; // Si no hay usuario, salir

    // Combinar los cambios con el usuario actual
    const updatedUser = {
      ...currentUser,
      ...updates
    };

    // Actualizar la signal y el almacenamiento
    this.userVideoCallRequest.set(updatedUser);
    this.storageService.saveToStorage('userVideoCallRequest', updatedUser);
  }

  resetUserVideoCallRequest() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('userVideoCallRequest');
    }
    this.userVideoCallRequest.set(null);
  }

  //-- save users profile
  readonly usersProfile = signal<User[]>(this.storageService.loadFromStorage<User[]>('usersProfile', []));

  addUsersProfile(updatedItems: User[]) {
    const uniqueMap = new Map<string, User>();

    // 1. Primero cargamos los usuarios actuales del Signal
    const currentUsers = this.usersProfile();
    currentUsers.forEach(user => {
      if (user.username) {
        uniqueMap.set(user.username.toLowerCase(), user);
      }
    });

    // 2. Procesamos los nuevos ítems
    updatedItems.forEach(newUser => {
      if (newUser.username) {
        const usernameKey = newUser.username.toLowerCase();
        const existingUser = uniqueMap.get(usernameKey);

        if (existingUser) {
          uniqueMap.set(usernameKey, { ...existingUser, ...newUser });
        } else {
          uniqueMap.set(usernameKey, newUser);
        }
      }
    });

    // Convertimos el Map de nuevo a un Array
    const cleanedItems = Array.from(uniqueMap.values());

    // 3. ORDENAMIENTO BLINDADO: Forzamos la conversión a booleanos puros
    cleanedItems.sort((a, b) => {
      // Convertimos de forma estricta a booleano real (soporta true, false, "true", "false", 1, 0)
      const isALive = a.live === true || String(a.live) === 'true';
      const isBLive = b.live === true || String(b.live) === 'true';

      const isAOnline = a.online === true || String(a.online) === 'true';
      const isBOnline = b.online === true || String(b.online) === 'true';

      // Convertimos las fechas a timestamps numéricos. 
      // Si es un string de fecha, Date.parse o new Date().getTime() es ideal.
      // Si ya viene como número (timestamp), se usa directo.
      const timeA = a.viewdAt ? new Date(a.viewdAt).getTime() : 0;
      const timeB = b.viewdAt ? new Date(b.viewdAt).getTime() : 0;

      // Criterio 1: Los que están en LIVE primero que todos
      if (isALive !== isBLive) {
        return isALive ? -1 : 1;
      }

      // Criterio 2: Desempate por ONLINE (Si ambos son LIVE o ninguno lo es)
      if (isAOnline !== isBOnline) {
        return isAOnline ? -1 : 1;
      }

      // Criterio 3: Desempate por FECHA (viewdAt) de forma descendente (Más reciente primero)
      // Si llegaron hasta aquí es porque tienen el mismo estado de LIVE y ONLINE
      if (timeA !== timeB) {
        return timeB - timeA; // Restar B - A ordena de mayor a menor (más nuevo primero)
      }

      // Criterio 4: Si todo lo demás es idéntico, mantenemos el orden original
      return 0;
    });

    // Guardamos en el storage y actualizamos el Signal con una nueva referencia de array
    this.storageService.saveToStorage('usersProfile', cleanedItems);
    this.usersProfile.set([...cleanedItems]); // El spread operator [...] asegura que Angular note el cambio de orden
  }

  updateUsersProfile(id: string, updates: Partial<User>) {
    const current = this.storageService.loadFromStorage<User[]>('usersProfile', []);
    const updated = current.map(item =>
      item._id === id ? { ...item, ...updates } : item
    );
    this.addUsersProfile(updated);
    this.storageService.saveToStorage('usersProfile', updated);
  }

  removeUsersProfile(postId: string) {
    const currentPosts = this.storageService.loadFromStorage<User[]>('usersProfile', [])
    const updatedPosts = currentPosts.filter(post => post._id !== postId);
    this.storageService.saveToStorage('usersProfile', updatedPosts);
    this.usersProfile.set(updatedPosts);
  }

  resetUsersProfile() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('usersProfile');
    }
    this.usersProfile.set([]);
  }

  //-- save users
  readonly users = signal<User[]>(this.storageService.loadFromStorage<User[]>('users', []));

  addUsers(updatedItems: User[]) {
    this.storageService.saveToStorage('users', updatedItems);
    this.users.set(updatedItems);
  }

  updateUsers(id: string, updates: Partial<User>) {
    const current = this.storageService.loadFromStorage<User[]>('users', []);
    const updated = current.map(item =>
      item._id === id ? { ...item, ...updates } : item
    );

    this.users.set(updated);
    this.storageService.saveToStorage('users', updated);
  }

  removeUsers(postId: string) {
    const currentPosts = this.storageService.loadFromStorage<User[]>('users', [])
    const updatedPosts = currentPosts.filter(post => post._id !== postId);
    this.storageService.saveToStorage('users', updatedPosts);
    this.users.set(updatedPosts);
  }

  resetUsers() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('users');
    }
    this.users.set([]);
  }

  // functions
  hasEnoughCredits(cost: number = 0): boolean {
    if (!this.getRoles('CLIENT')) {
      return true;
    }
    const userCreditService = this.injector.get(UserCreditService);
    const currentCredit = Number(userCreditService.userCredit()?.current || 0);
    if (currentCredit <= 0 || currentCredit < cost) {
      return false;
    }
    return true;
  }

  getRoles(role: string): boolean {
    const authService = this.injector.get(AuthService);
    return !!authService.user()?.roles?.includes(role as UserRole);
  }

}
