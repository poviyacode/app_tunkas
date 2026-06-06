// zego.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ZegoService {
  private zg: any;
  private appId = 'your_app_id';
  private server = 'wss://wsliveroom-test.zego.im/ws'; // Cambia a la URL del servidor de producción
  private stream: any;

  constructor() {
    //this.initZego();
  }

  // initZego() {
  //   this.zg = new ZegoExpressEngine(this.appId, this.server);
  //   this.zg.setDebugVerbose(true);
  // }

  async createStream(elementId: string) {
    this.stream = await this.zg.createStream({
      camera: {
        audio: true,
        video: true
      }
    });
    this.stream.play(elementId);
    return this.stream;
  }

  async startPublishingStream() {
    await this.zg.startPublishingStream(this.stream);
  }

  async stopStream() {
    await this.zg.stopStream(this.stream);
  }

  async logout() {
    await this.zg.logoutRoom();
  }
}
