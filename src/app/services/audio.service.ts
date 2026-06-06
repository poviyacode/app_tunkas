// audio.service.ts

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioPlayer: HTMLAudioElement;

  constructor() {
    this.audioPlayer = new Audio();
  }

  playAudio(audioUrl: string): void {
    this.audioPlayer.src = audioUrl;
    this.audioPlayer.load();
    this.audioPlayer.play();
  }

  pauseAudio(): void {
    this.audioPlayer.pause();
  }
}
