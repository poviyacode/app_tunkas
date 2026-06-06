import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Headers } from '../core/common/http-headers';
import { LiveStream } from '@interfaces/liveStream';
import { SocketService } from './socket.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { User } from '@interfaces/user';

@Injectable({
  providedIn: 'root'
})
export class LiveStreamService {

  apiUrl = `${environment.api}/live-stream`;

  private http = inject(HttpClient);
  private storageService = inject(StorageService);
  private socketService = inject(SocketService);
  private authService = inject(AuthService);

  handleLiveStreamStatus(data: any): Observable<LiveStream | null> {
    return this.http.post<LiveStream>(this.apiUrl + '/handleLiveStreamStatus', data, Headers.HttpOptions())
      .pipe(
        tap((liveStream) => {
          if (!liveStream) return;

          if (!this.socketService.socket) {
            this.socketService.connect();
          }

          const isLiveActive = data?.User?.live ?? data?.live;
          const roomId = liveStream.liveRoomId;

          if (roomId && isLiveActive) {
            this.addLiveStream(liveStream);

            this.socketService.joinRoom(roomId, (res) => {
              if (res && res.status === 'joined') {
                console.log('Socket joined room:', res.room);
              }
            });

          } else if (roomId && !isLiveActive) {
            this.resetLiveStream();
            this.socketService.leaveRoom(roomId, (res) => {
              if (res && res.status === 'left') {
                console.log('Socket left room:', res.room);
              }
            });
          }
        }),
        catchError((err) => {
          return of(null);
        })
      );
  }

  handleLiveStreamStatus0(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/handleLiveStreamStatus', data, Headers.HttpOptions())
      .pipe(
        tap((liveStream) => {
          //this.addLiveStream(liveStream);
          console.log('🚀 liveStream', liveStream.liveRoomId && data.User.live);
          // if (liveStream && liveStream.liveRoomId && data.User.live) {
          //   console.log('🚀 Live Stream Status:', liveStream.liveRoomId);
          //   this.addLiveStream(liveStream);
          //   this.socketService.joinRoom(liveStream.liveRoomId, (res) => {
          //     if (res && res.status === 'joined') {
          //       console.log('Socket joined room:', res.room);
          //     }
          //   });
          // } else if (liveStream && liveStream.liveRoomId && !data.live) {
          //   this.resetLiveStream();
          //   this.socketService.leaveRoom(liveStream.liveRoomId, (res) => {
          //     if (res && res.status === 'left') {
          //       console.log('Socket left room:', res.room);
          //     }
          //   });
          // }
        })
      );
  }

  getStreamBy(data: any): Observable<LiveStream> {
    return this.http.post<LiveStream>(this.apiUrl + '/getStreamBy', data, Headers.HttpOptions());
  }

  acceptCall(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/acceptCall', data, Headers.HttpOptions());
  }

  rejectCall(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/rejectCall', data, Headers.HttpOptions())
      .pipe(
        tap((liveStream) => {
          if (liveStream && liveStream.liveRoomId) {
            this.resetLiveStream();
            this.socketService.leaveRoom(liveStream.liveRoomId, (res) => {
              if (res && res.status === 'left') {
                console.log('Socket left room:', res.room);
              }
            });
          }
        })
      );
  }

  //--- signals
  public readonly liveStream = signal<LiveStream | null>(
    this.storageService.loadFromStorage<LiveStream | null>('liveStream', null)
  );

  addLiveStream(value: LiveStream) {
    this.storageService.saveToStorage('liveStream', value);
    this.liveStream.set(value);
  }

  updateLiveStream(updates: Partial<LiveStream>) {
    const currentLiveStream = this.liveStream();
    if (!currentLiveStream) return;

    const updatedLiveStream = {
      ...currentLiveStream,
      ...updates
    };

    this.liveStream.set(updatedLiveStream);
    this.storageService.saveToStorage('liveStream', updatedLiveStream);
  }

  resetLiveStream() {
    this.storageService.removeFromStorage('liveStream');
    this.liveStream.set(null);
  }

  // functions
  getParticipantRole(liveStreamData: LiveStream, currentUserId: string): {
    MyParticipant: any;
    OtherParticipants: any[];
    UserTransmitter: any
  } {

    // Estructura por defecto consistente
    const defaultResponse = {
      MyParticipant: null,
      OtherParticipants: [],
      UserTransmitter: null
    };

    if (!liveStreamData || !currentUserId) {
      return defaultResponse;
    }

    // ==========================================
    // CASO 1: VIDEOCALL (Llamada bidireccional / grupal)
    // ==========================================
    if (liveStreamData.transmissionType === 'VIDEOCALL') {
      const participants = liveStreamData.participants || [];

      const myParticipant = participants.find(p => p.User?._id === currentUserId);
      const otherParticipants = participants.filter(p => p.User?._id !== currentUserId);

      // En una videollamada, el "transmitter" original suele ser el creador de la sala (liveStreamData.User)
      // o el participante que tenga explícitamente el rol de transmitter
      const transmitterParticipant = participants.find(p => p.role === 'transmitter' || p.User?._id === liveStreamData.User?._id);

      return {
        MyParticipant: myParticipant ? { ...myParticipant.User, liveRole: myParticipant.role } : null,
        OtherParticipants: otherParticipants.map(p => ({ ...p.User, liveRole: p.role })),
        UserTransmitter: transmitterParticipant ? { ...transmitterParticipant.User, liveRole: transmitterParticipant.role } : { ...liveStreamData.User, role: 'transmitter' }
      };
    }

    // ==========================================
    // CASO 2: STREAMING (Un Transmisor fijo y N espectadores)
    // ==========================================
    if (liveStreamData.transmissionType === 'STREAMING') {

      if (!liveStreamData.User) return defaultResponse;
      const esTransmisor = liveStreamData.User._id === currentUserId;
      // 1. Tu propio perfil adaptado al rol
      const myParticipant = {
        User: esTransmisor ? { ...liveStreamData.User } : { _id: currentUserId },
        liveRole: esTransmisor ? 'transmitter' : 'audience'
      };

      // 2. Filtrar el resto de la audiencia
      const espectoresFiltrados = (liveStreamData.participants || [])
        .filter((p: any) => p.User?._id !== currentUserId)
        .map((p: any) => ({ ...p, liveRole: 'audience' }));

      return {
        MyParticipant: myParticipant,
        OtherParticipants: espectoresFiltrados,
        // 🌟 Aquí devolvemos directamente al dueño del Stream como el Transmitter
        UserTransmitter: { ...liveStreamData.User }
      };
    }

    // ==========================================
    // CASO 2: STREAMING (Un Transmisor fijo y N espectadores)
    // ==========================================
    if (liveStreamData.transmissionType === 'NONE') {

      if (!liveStreamData.User) return defaultResponse;
      const esTransmisor = liveStreamData.User._id === currentUserId;
      // 1. Tu propio perfil adaptado al rol
      const myParticipant = {
        User: esTransmisor ? { ...liveStreamData.User } : { _id: currentUserId },
        liveRole: esTransmisor ? 'transmitter' : 'audience'
      };

      // 2. Filtrar el resto de la audiencia
      const espectoresFiltrados = (liveStreamData.participants || [])
        .filter((p: any) => p.User?._id !== currentUserId)
        .map((p: any) => ({ ...p, liveRole: 'audience' }));

      return {
        MyParticipant: myParticipant,
        OtherParticipants: espectoresFiltrados,
        // 🌟 Aquí devolvemos directamente al dueño del Stream como el Transmitter
        UserTransmitter: { ...liveStreamData.User }
      };
    }

    return defaultResponse;
  }
}
