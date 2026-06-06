import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Manager, Socket } from 'socket.io-client';
import { BaseHttpService } from './base-http.service';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {


  http = inject(HttpClient);
  private userService = inject(UserService);
  //public authService = inject(AuthService)

  apiUrl = environment.api;
  apiSocket = environment.apiSocket;

  public socket: Socket;
  private status: boolean = false;

  socketConnect(accessToken: any) {
    if (accessToken) {
      const manager = new Manager(this.apiSocket, {
        extraHeaders: {
          Authorization: `${accessToken}`,
        }
      });
      this.socket = manager.socket('/poviya');

      this.socket.on('connect', () => {
        console.log('connectted');
        this.status = true;

      });

      this.socket.on('disconnect', () => {
        console.log('disconnect');
        this.status = false;
      });
    }
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  get socketStatus() {
    return this.status;
  }

  connectSocket() {
    this.socketConnect(JSON.parse(localStorage.getItem('access_token')!));
  }

}
