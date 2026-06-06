import { HttpClient } from '@angular/common/http';
import { Injectable, signal, inject, Injector } from '@angular/core';
import { Observable, combineLatest, delay, forkJoin, from, lastValueFrom, map, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Headers } from '../core/common/http-headers';
import { Chat } from '@interfaces/chat';
import { Firestore, collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, collectionData, getDoc, setDoc, getDocs, startAfter, limit, QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { StorageService } from './storage.service';
import { User, UserCurrent } from '@interfaces/user';
import { UserService } from './user.service';
import { MessageService } from './message.service';
import { SpinnerService } from './spinner.service';
import { ToastService } from './toast.service';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  apiUrl = `${environment.api}/chat`;

  private http = inject(HttpClient);
  private firestore = inject(Firestore);
  private storageService = inject(StorageService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  private spinnerService = inject(SpinnerService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private injector = inject(Injector);

  private get authService() {
    return this.injector.get(AuthService);
  }

  // create
  create(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data, Headers.HttpOptions());
  }

  update(id: string, data: any): Observable<Chat> {
    const uri = this.apiUrl + '/' + id;
    return this.http.put<Chat>(uri, data, Headers.HttpOptions());
  }

  // find by ud user
  findByIdUser(data: any, limit: number, offset: number): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/findByIdUser?limit=${limit}&offset=${offset}`, data, Headers.HttpOptions())
      ;
  }

  getConversations(data: any, limit: number, offset: number): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/getConversations?limit=${limit}&offset=${offset}`, data, Headers.HttpOptions())
      ;
  }

  // find one chat
  findOne(id: any): Observable<any> {
    return this.http
      .get<any>(this.apiUrl + '/' + id, Headers.HttpOptions());
  }

  // Chat By Id
  chatById(id: any): Promise<any> {
    return lastValueFrom(this.http.get<any>(this.apiUrl + '/chatById/' + id, Headers.HttpOptions())
    );
  }

  // Chat By Receiver
  chatByReceiver(data: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.apiUrl + '/chatByReceiver', data, Headers.HttpOptions())
    );
  }

  // find one messages
  findOneMessages(id: any): Observable<any> {
    return this.http
      .get<any>(this.apiUrl + '/find-one-messages/' + id, Headers.HttpOptions());
  }

  // chat media
  findAllChatMedia(data: any, limit: number, offset: number): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/findAllChatMedia?limit=${limit}&offset=${offset}`, data)
      ;
  }

  // save chats
  readonly chats = signal<Chat[]>(this.storageService.loadFromStorage<Chat[]>('chats', []));

  addChats(updatedChats: Chat[]) {
    this.storageService.saveToStorage('chats', updatedChats);
    this.chats.set(updatedChats);
  }

  updateChats(id: string, updates: Partial<Chat>) {
    const current = this.storageService.loadFromStorage<Chat[]>('chats', []);
    const updated = current.map(item =>
      (item._id === id || item.id === id) ? { ...item, ...updates } : item
    );

    this.chats.set(updated);
    this.storageService.saveToStorage('chats', updated);
  }

  removeChats(chatId: string) {
    const currentChats = this.storageService.loadFromStorage<Chat[]>('chats', [])
    const updatedChats = currentChats.filter(chat => chat._id !== chatId && chat.id !== chatId)
    this.storageService.saveToStorage('chats', updatedChats);
    this.chats.set(updatedChats);
  }

  resetChats() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('chats');
    }
    this.chats.set([]);
  }

  // save chat
  public readonly chat = signal<Chat | null>(this.storageService.loadFromStorage<Chat | null>('chat', null));

  addChat(value: Chat) {
    this.storageService.saveToStorage('chat', value);
    this.chat.set(value);
  }

  updateChat(updates: Partial<Chat>) {
    const currentUser = this.chat();
    if (!currentUser) return; // Si no hay usuario, salir

    // Combinar los cambios con el usuario actual
    const updated = {
      ...currentUser,
      ...updates
    };

    // Actualizar la signal y el almacenamiento
    this.chat.set(updated);
    this.storageService.saveToStorage('chat', updated);
  }


  //********************* firebase */ 
  // Crear un chat entre dos usuarios si no existe
  async createChatFire(userId1: string, userId2: string) {
    const chatId = [userId1, userId2].sort().join('_'); // ID único para la conversación
    const chatRef = doc(this.firestore, `chats/${chatId}`);
    const chatSnapshot = await getDoc(chatRef);

    if (!chatSnapshot.exists()) {
      await setDoc(chatRef, {
        users: [userId1, userId2],
        lastMessage: '',
        timestamp: new Date()
      });

    }

    return chatId;
  }

  // Obtener la lista de chats del usuario actual
  getUserChatsFireppp(
    userId: string,
    pageSize: number,
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>
  ): Observable<{ chats: any[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    const chatsRef = collection(this.firestore, 'chats');

    // Crear la consulta base
    let q = query(
      chatsRef,
      where('users', 'array-contains', userId),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );

    // Agregar startAfter si hay un documento de referencia
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    return from(getDocs(q)).pipe(
      switchMap((snapshot) => {
        // Mapear y procesar cada documento de chat
        const chatPromises = snapshot.docs.map(async (chatDoc: any) => {
          const chatData = chatDoc.data();
          const receiverId = chatData.users.find((id: string) => id !== userId);
          const userRef = doc(this.firestore, `users/${receiverId}`);
          const userSnapshot = await getDoc(userRef);

          return {
            id: chatDoc.id,
            lastMessage: chatData.lastMessage,
            timestamp: chatData.timestamp,
            Receiver: userSnapshot.data() // Datos del receptor
          };
        });

        // Convertir las promesas en un observable y empaquetar el resultado
        return from(Promise.all(chatPromises)).pipe(
          map((chats) => ({
            chats,
            lastDoc: snapshot.empty ? null : snapshot.docs[snapshot.docs.length - 1]
          }))
        );
      })
    );
  }

  getUserChatsFire1111111111111(userId: string, pageSize: number, startAfterDoc?: QueryDocumentSnapshot<DocumentData>): Observable<any[]> {
    const chatsRef = collection(this.firestore, 'chats');
    let q = query(
      chatsRef,
      where('users', 'array-contains', userId),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        const chats = snapshot.docs.map(async (chatDoc: any) => {
          const chatData = chatDoc.data();
          const receiverId = chatData.users.find((id: string) => id !== userId);
          const userRef = doc(this.firestore, `users/${receiverId}`);
          const userSnapshot = await getDoc(userRef);
          const Receiver = userSnapshot.data();
          return {
            id: chatDoc.id,
            lastMessage: chatData.lastMessage,
            timestamp: chatData.timestamp,
            Receiver // Datos del usuario que envió el último mensaje
          };
        });
        return Promise.all(chats);
      })
    );
  }

  getUserChatsFireMe(userId: string, pageSize: number, startAfterDoc?: QueryDocumentSnapshot<DocumentData>): Observable<any[]> {
    return new Observable(observer => {
      const chatsRef = collection(this.firestore, 'chats');

      const q = query(chatsRef,
        where('users', 'array-contains', userId),
        orderBy('timestamp', 'desc'),
        //limit(pageSize)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const chats = await Promise.all(snapshot.docs.map(async (chatDoc: any) => {
          const chatData = chatDoc.data();
          const receiverId = chatData.users.find((id: string) => id !== userId);
          const lastMessageSenderId = chatData.lastMessageSenderId; // ID del usuario que envió el último mensaje

          // Obtener perfil del usuario que envió el último mensaje
          const userRef = doc(this.firestore, `users/${receiverId}`);
          const userSnapshot = await getDoc(userRef);
          const Receiver = userSnapshot.data();
          return {
            id: chatDoc.id,
            lastMessage: chatData.lastMessage,
            timestamp: chatData.timestamp,
            Receiver // Datos del usuario que envió el último mensaje
          };
        }));

        observer.next(chats);
      });

      return () => unsubscribe();
    });
  }

  getUserChatsFire12(userId: string): Observable<any[]> {

    return new Observable(observer => {
      const messagesRef = collection(this.firestore, 'chats');

      const q = query(messagesRef,
        where('users', 'array-contains', userId),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        observer.next(messages);
      });

      return () => unsubscribe();
    });

  }

  // Obtener la lista de chats con información del usuario receptor
  getUserChatsFire000(userId: string): Observable<any[]> {
    const chatsRef = collection(this.firestore, 'chats');
    const q = query(chatsRef, where('users', 'array-contains', userId), orderBy('timestamp', 'desc'));

    return collectionData(q, { idField: 'id' }).pipe(
      switchMap(chats => {
        console.log(chats)
        if (chats.length === 0) return from([[]]); // Si no hay chats, retorna un array vacío

        const chatObservables = chats.map((chat: any) => {
          const receiverId = chat.users.find((id: string) => id !== userId);
          if (!receiverId) return from([null]); // Evitar errores si no hay receptor

          return from(getDoc(doc(this.firestore, `users/${receiverId}`))).pipe(
            map(userSnapshot => ({
              id: chat.id,
              lastMessage: chat.lastMessage,
              timestamp: chat.timestamp,
              receiverProfile: userSnapshot.exists() ? userSnapshot.data() : null
            }))
          );
        });

        return forkJoin(chatObservables); // `forkJoin` espera que todas las peticiones terminen
      })
    );
  }

  getUserChatsFire09(userId: string): Observable<any[]> {
    const chatsRef = collection(this.firestore, 'chats');
    const q = query(chatsRef, where('users', 'array-contains', userId), orderBy('timestamp', 'desc'));

    return from(getDocs(q)).pipe(
      switchMap(chatsSnapshot => {
        const chatObservables = chatsSnapshot.docs.map((chatDoc: any) => {
          const chatData = chatDoc.data();
          const receiverId = chatData.users.find((id: string) => id !== userId);

          // Obtener información del usuario receptor
          return from(getDoc(doc(this.firestore, `users/${receiverId}`))).pipe(
            map(userSnapshot => ({
              id: chatDoc.id,
              lastMessage: chatData.lastMessage,
              timestamp: chatData.timestamp,
              receiverProfile: userSnapshot.exists() ? userSnapshot.data() : null
            }))
          );
        });

        return combineLatest(chatObservables);
      })
    );
  }
  //////////////////////////////////////////////////
  // 1. Función para cargar páginas (con getDocs)
  getUserChatsFire(
    userId: string,
    pageSize: number,
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>
  ): Observable<{ chats: any[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    const chatsRef = collection(this.firestore, 'chats');
    let q = query(
      chatsRef,
      where('users', 'array-contains', userId),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        const chats = snapshot.docs.map(async (chatDoc: any) => {
          const chatData = chatDoc.data();
          const receiverId = chatData.users.find((id: string) => id !== userId);
          const userRef = doc(this.firestore, `users/${receiverId}`);
          const userSnapshot = await getDoc(userRef);

          return {
            id: chatDoc.id,
            lastMessage: chatData.lastMessage,
            timestamp: chatData.timestamp,
            Receiver: userSnapshot.data()
          };
        });
        return Promise.all(chats).then(chats => ({
          chats,
          lastDoc: snapshot.empty ? null : snapshot.docs[snapshot.docs.length - 1]
        }));
      })
    );
  }

  // 2. Función para escuchar NUEVOS mensajes en tiempo real
  listenForNewChats(userId: string, latestTimestamp: Date): Observable<any[]> {
    const chatsRef = collection(this.firestore, 'chats');
    const q = query(
      chatsRef,
      where('users', 'array-contains', userId),
      orderBy('timestamp', 'desc'),
      //where('timestamp', '>', latestTimestamp)
    );

    return new Observable(subscriber => {
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const newChats = await Promise.all(snapshot.docs.map(async (chatDoc: any) => {
          const chatData = chatDoc.data();
          const receiverId = chatData.users.find((id: string) => id !== userId);
          const userRef = doc(this.firestore, `users/${receiverId}`);
          const userSnapshot = await getDoc(userRef);

          return {
            id: chatDoc.id,
            lastMessage: chatData.lastMessage,
            timestamp: chatData.timestamp,
            Receiver: userSnapshot.data()
          };
        }));
        subscriber.next(newChats);
      });
      return () => unsubscribe();
    });
  }

  // functions
  async startChatWithProfile(data: { Sender: User, Receiver: User }) {

    const { Sender, Receiver } = data;
    const currentUser = Sender;
    const targetProfile = Receiver;

    // 1. Validar autenticación
    if (!currentUser?._id) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // 2. Validar estado de cuenta
    if (currentUser.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    // 3. Evitar chat con uno mismo
    if (currentUser._id === targetProfile?._id) return;

    this.spinnerService.start();

    const dataSend = { Receiver: targetProfile! };

    this.create(dataSend).subscribe({
      next: (res) => {
        if (res) {
          this.messageService.addUserReceiver(targetProfile!);
          this.addChat(res);
          this.router.navigate(['/chats/messages', res._id]);
        }
      },
      error: () => {
        this.spinnerService.close();
        this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
      },
      complete: () => this.spinnerService.close()
    });
  }

}
