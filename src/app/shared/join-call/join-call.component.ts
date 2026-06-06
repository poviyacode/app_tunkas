import {
  ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output, PLATFORM_ID, inject, signal
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { NgZone } from '@angular/core';

import { User } from '@interfaces/user';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/auth.service';
import { MessageService } from '@services/message.service';
import { SocketService } from '@services/socket.service';
import { ToastService } from '@services/toast.service';
import { SpinnerService } from '@services/spinner.service';
import { ChatService } from '@services/chat.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from '@services/user.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { ToolsService } from '@services/tools.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { LiveStreamService } from '@services/live-stream.service';
import { PostMediaDetails } from '@interfaces/postMedia';
import { PostMediaService } from '@services/post-media.service';

@Component({
  selector: 'app-join-call',
  imports: [
    TranslateModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    IconDirective
],
  animations: [
    trigger('flyInOut', [
      state('in', style({ transform: 'translateX(0) scale(1)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translateX(0) scale(0.95)', opacity: 0 }),
        animate('400ms cubic-bezier(0.68, -0.55, 0.27, 1.55)', style({ transform: 'translateX(0) scale(1)', opacity: 1 }))
      ]),
      transition('* => void', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0) scale(0.95)', opacity: 0 }))
      ]),
    ]),
  ],
  templateUrl: './join-call.component.html',
  styleUrl: './join-call.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JoinCallComponent implements OnInit, OnDestroy {

  isBrowser: boolean;
  isServer: boolean;

  private destroy$ = new Subject<void>();

  videoCallID: string | null;
  roomID: string | null;
  currentDate: any;
  isCall = signal(false);
  MyParticipant = signal<User | null>(null);
  OtherParticipant = signal<User | null>(null);

  private callTimeoutId: any;
  role = signal('audience');
  audio: HTMLAudioElement | null = null;

  @Output() closeModal = new EventEmitter<void>();

  // Inyecciones compartidas limpias
  public dialogService = inject(DialogService);
  public authService = inject(AuthService);
  public userService = inject(UserService);
  private socketService = inject(SocketService);
  public messageService = inject(MessageService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private spinnerService = inject(SpinnerService);
  public chatService = inject(ChatService);
  private platformId = inject(PLATFORM_ID);
  private toolsService = inject(ToolsService);
  private ngZone = inject(NgZone); // 2. Inyección para aislar procesos asíncronos
  public liveStreamService = inject(LiveStreamService);
  public postMediaService = inject(PostMediaService);

  constructor() {
    this.messageService.resetMessages();
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.initVideoCall();
      this.userOnlineSocket();
    }
  }

  async ngOnDestroy() {
    if (this.isBrowser) {
      this.destroy$.next();
      this.destroy$.complete();
      this.stopSoundVideoCall();
      this.clearCallTimeout();
    }
  }

  initVideoCall() {
    const liveStreamData = this.liveStreamService.liveStream();
    const currentUserId = this.authService.user()?._id;

    if (liveStreamData && liveStreamData.participants) {
      this.playSoundVideoCall();
      this.startCallTimeout(); // 🔥 CORRECCIÓN: Iniciar el contador de 10s

      const participants = liveStreamData.participants;

      const myParticipant = participants.find((p: any) => p.User?._id === currentUserId);
      const otherParticipant = participants.find((p: any) => p.User?._id !== currentUserId);

      this.MyParticipant.set(myParticipant!.User!);
      this.OtherParticipant.set(otherParticipant!.User!);

      if (myParticipant) {
        if (myParticipant.role === 'transmitter') {
          this.role.set('transmitter');
        } else {
          this.role.set('audience');
        }
      }
    }
  }

  userOnlineSocket() {

    if (!this.socketService.socket) {
      this.socketService.connect();
    }

    this.socketService
      .onCallRejectedByAudience()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.onCloseModal();
        this.liveStreamService.resetLiveStream();
      });

    this.socketService
      .onCallCanceledByTransmiter()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.onCloseModal();
        this.liveStreamService.resetLiveStream();
      });

    this.socketService
      .onUserJoinedCall()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.onCloseModal();
        this.stopSoundVideoCall();
        this.router.navigate(['/videocall', data.liveRoomId]);
      });
  }

  onAcceptCall() {
    this.onCloseModal();
    this.stopSoundVideoCall();

    const data = {
      liveRoomId: this.liveStreamService.liveStream()?.liveRoomId,
    }
    this.liveStreamService.acceptCall(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.router.navigate(['/videocall', this.liveStreamService.liveStream()?.liveRoomId]);
          }
        }
      });
  }

  onRejectCall() {
    this.onCloseModal();
    this.stopSoundVideoCall();

    const data = {
      liveRoomId: this.liveStreamService.liveStream()?.liveRoomId,
    }

    this.liveStreamService.rejectCall(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }
  // live
  async onLiveStream() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.router.navigateByUrl(`/${user.username}`);
      return;
    }

    const data = {
      transmissionType: 'VIDEOCALL',
      live: true
    };

    this.spinnerService.start();

    this.liveStreamService.handleLiveStreamStatus(data).subscribe({
      next: (res) => {
        if (res) {
          this.authService.updateUser(res);
          this.router.navigateByUrl(`${user.username}/videocall`);
        }
        this.spinnerService.close();
      },
      error: (err) => {
        this.spinnerService.close();
        this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
      },
      complete: () => {
        this.spinnerService.close();
        this.toastService.start({ type: 'success', message: 'completedSuccessfully' });
      }
    });
  }

  playSoundVideoCall() {
    if (!this.audio) {
      this.audio = new Audio('public/sounds/positive-smartphone.mp3');
    }
    // El audio nativo no debe retrasar los ciclos internos de Zone.js
    this.ngZone.runOutsideAngular(() => {
      this.audio!.play().catch((error) => console.warn('Audio play blockeado o diferido:', error));
    });
  }

  stopSoundVideoCall() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  onMessageCall(data: any) {
    const { type, message } = data;

    if (this.chatService.chat()) {
      const createPostMedia: any = [];
      const sendData: any = {
        code: uuidv4(),
        filesArray: createPostMedia,
        Chat: this.chatService.chat()!._id,
        Sender: this.userService.userVideoCallRequest()?.Caller?._id,
        Receiver: this.userService.userVideoCallRequest()?.Callee?._id,
        message: message,
        status: 'SENT',
        Reply: null,
        credit: 0,
        typeView: 'FREE',
        isPreviewMedia: false,
        PostMedia: createPostMedia,
        type: type,
        createdAt: new Date(),
      };

      const currentMessages = this.messageService.messages();
      this.messageService.addMessages([...currentMessages, sendData]);
      this.onSendMessage(sendData);
    }
  }

  async onSendMessage(data: any) {
    this.messageService.create(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  startCallTimeout() {
    this.clearCallTimeout();

    // 4. CORRECCIÓN CLAVE TIMEOUT: Correr setTimeout fuera de Angular evita que se congele la hidratación por 10s
    this.ngZone.runOutsideAngular(() => {
      this.callTimeoutId = setTimeout(() => {

        this.ngZone.run(() => {
          if (this.role() === 'audience') {
            if (this.isCall()) {
              this.onRejectCall();
            } else {
              this.isCall.set(false);
              this.closeModal.emit();
            }
          } else if (this.role() === 'transmitter') {
            this.isCall.set(false);
            this.closeModal.emit();
          }
        });

      }, 10000);
    });
  }

  clearCallTimeout() {
    if (this.callTimeoutId) {
      clearTimeout(this.callTimeoutId);
      this.callTimeoutId = null;
    }
  }

  onCloseModal() {
    this.closeModal.emit(); // Notifica al padre que el modal se cerró
  }

  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // get media details
  getMediaDetails(item: any): PostMediaDetails | null {
    return this.postMediaService.getBackgroundImageUrl(item);
  }
}