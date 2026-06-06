import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ApplicationRef, Component, ComponentRef, CUSTOM_ELEMENTS_SCHEMA, ElementRef, HostListener, inject, PLATFORM_ID, signal, ViewChild, ViewContainerRef, OnInit, AfterViewChecked, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { environment } from '@environments/environment';
import { CommentLive } from '@interfaces/comment';
import { User } from '@interfaces/user';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { CloudflareService } from '@services/cloudflare.service';
import { CommentService } from '@services/comment.service';
import { DialogService } from '@services/dialog.service';
import { SocketService } from '@services/socket.service';
import { SpinnerService } from '@services/spinner.service';
import { SubscriptionService } from '@services/subscription.service';
import { TipService } from '@services/tip.service';
import { ToastService } from '@services/toast.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { UserCreditService } from '@services/user-credit.service';
import { UserService } from '@services/user.service';
import { ZegoCloudService } from '@services/zegocloud.service';
import { LiveStreamService } from '@services/live-stream.service';
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import { TipComponent } from '@shared/tip/tip.component';
import { filter, Subject, takeUntil } from 'rxjs';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import GraphemeSplitter from 'grapheme-splitter';
import { AutoResizeTextareaDirective } from '@directive/auto-resize-textarea.directive';
import { ZegoRoomConfig, ZegoUser } from 'zego-express-engine-webrtc/sdk/code/zh/ZegoExpressEntity.rtm';
import { TransactionCredit } from '@interfaces/transactionCredit';
import { IconDirective } from '@directive/coin-svg.directive';
import { DateAgoPipe } from '@pipes/date-ago.pipe';
import { ToolsService } from '@services/tools.service';
import { PostMediaService } from '@services/post-media.service';
import { PostMediaDetails } from '@interfaces/postMedia';
import { Tools } from '@core/common/tools';
import { Money } from '@interfaces/money';
import { DropdownMenuItem } from '@interfaces/tools';

@Component({
  selector: 'app-live-profile',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    IconDirective,
    TranslateModule,
    RouterModule,
    DateAgoPipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
    trigger('chatAnimation', [
      transition('void => *', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('350ms cubic-bezier(0.21, 1.02, 0.43, 1.01)',
          style({ transform: 'translateY(0)', opacity: 1 })
        )
      ]),
      transition('* => void', [
        animate('250ms cubic-bezier(0.25, 1, 0.5, 1)',
          style({ transform: 'translateY(20px)', opacity: 0 })
        )
      ])
    ]),
  ],
  templateUrl: './live-profile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './live-profile.component.scss'
})
export default class LiveProfileComponent implements OnInit, AfterViewChecked, OnDestroy {

  isBrowser: boolean;
  isServer: boolean;
  loading = false;
  showEmojiPicker = false;

  emojis: Record<string, string[]> = {
    '😀': ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"],
    '👋': ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "🖕", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦵", "🦿", "🦶", "👣"],
    '🙈': ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "Ant", "🪰", "🪲", "🪳", " Mosquito", "🦗", "🕷️", "🕸️", "🦂", "🐢"],
    '🍉': ["🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🍅", "🫒", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🫘", "🌰", "Bread", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "Bacon", "🍔", "🍟", "🍕", "🌭", " Sandwich", "🌮", "🌯", "🫔", "🥙", "🧆", "🥗", "🥘", "🫕", "🍝", "🍜", "🍲", "Curry", "🍣", "🍤", "🥟", "🦪", "🍥"],
    '❤️': ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🈳", "🈹", "☢️", "☣️", "🚭", "❗", "❓"]
  };

  emojiCategories: string[] = Object.keys(this.emojis);
  emojiSelectedTab = 0;
  private allowedCharacters = /^[a-zA-Z0-9\s]$/;

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  @ViewChild('localVideo', { static: true }) localVideo!: ElementRef;
  @ViewChild('remoteVideo', { static: true }) remoteVideo!: ElementRef;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('emojiContainer') emojiContainer!: ElementRef;
  @ViewChild('videoPlayback') videoPlayback!: ElementRef<HTMLVideoElement>;

  @ViewChild(AutoResizeTextareaDirective) autoResizeTextarea!: AutoResizeTextareaDirective;

  private destroy$ = new Subject<void>();

  // Signals de estado exclusivos del Stream
  public roomState = signal<string>('DISCONNECTED');
  public publisherState = signal<string>('NO_PUBLISH');
  public publisherStateNotification = signal<string>('');
  public transmissionType = signal<string>('STREAMING'); // Forzado a STREAMING
  public role = signal<string>('none');
  showMore = signal(false);
  public streamOrigin = signal<'browser' | 'obs'>('obs');

  private zgEngine!: ZegoExpressEngine;
  private appID: number = environment.zegocloudAppID;
  private server: string = environment.zegoCloudServer;

  slug: null | string = null;
  roomID!: string;
  streamID!: string;
  localStream: any = null;
  viewRemote = signal(false);
  viewLocal = signal(false);
  public userList = signal<Array<{ userID: string; userName: string }>>([]);

  myFormComment!: FormGroup;
  private splitter = new GraphemeSplitter();

  // Scroll variables
  private isUserNearBottom = true;
  showScrollButton = false;
  private isUserScrolling = false;
  private lastScrollTop = 0;

  private tipComponentRef: ComponentRef<TipComponent> | null = null;
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;

  totalPagesIncome = 0;
  currentPageIncome = 0;
  limitPageIncome = 10;
  hasMoreIncome = true;
  showComments: boolean = false;
  public isAudienceMuted = signal<boolean>(false);

  public UserTransmiter = signal<User | null>(null);
  public UsersSpectator = signal<User[]>([]);
  public MyParticipant = signal<User | null>(null);

  public activeMenu = signal<string | null>(null);
  public activEemoji = signal<string | null>(null);
  private isIntentionallyLeaving = false;
  public money = signal<Money | null>(null);

  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService);
  private zegoCloudService = inject(ZegoCloudService);
  private spinnerService = inject(SpinnerService);
  //public userService = inject(UserService);
  private activatedRoute = inject(ActivatedRoute);
  private socketService = inject(SocketService);
  public dialogService = inject(DialogService);
  private tipService = inject(TipService);
  public router = inject(Router);
  public toastService = inject(ToastService);
  public userCreditService = inject(UserCreditService);
  public subscriptionService = inject(SubscriptionService);
  public transactionCreditService = inject(TransactionCreditService);
  public commentService = inject(CommentService);
  private toolsService = inject(ToolsService);
  private postMediaService = inject(PostMediaService);
  public liveStreamService = inject(LiveStreamService);
  private cloudflareService = inject(CloudflareService);

  constructor() {
     this.zgEngine = new ZegoExpressEngine(this.appID, this.server);
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    if (this.isBrowser) {
      this.activatedRoute.paramMap.subscribe(async (params) => {
        this.slug = params.get('slug');
        if (!this.slug) {
          this.router.navigate(['/']);
          return;
        }
        this.findActiveLiveStream();
      });
    }
  }

  async ngOnInit() {
    this.createFormCommentControls();
  }

  ngAfterViewChecked() {

  }

  async ngOnDestroy() {
    if (this.isBrowser) {
      this.destroy$.next();
      this.destroy$.complete();

      this.detachSocketEvents();

      this.clearCreditPurchaseComponent();
      this.clearTipComponent();
      this.transactionCreditService.resetTransactionCreditsIncomeLiveUser();

      if (this.role() === 'transmitter' && !this.isIntentionallyLeaving) {
        const data = { transmissionType: 'STREAMING', live: false };
        // Usamos una llamada desvinculada (fire-and-forget) para apagar el directo en la API antes de que el componente muera por completo
        this.liveStreamService.handleLiveStreamStatus(data).subscribe();
      }

      this.logoutRoom();
    }
  }

  findActiveLiveStream() {

    this.spinnerService.start();
    this.loading = true;

    const data = {
      username: this.slug,
    }

    this.liveStreamService.getStreamBy(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (livePayload) => {

          if (livePayload) {
            this.liveStreamService.addLiveStream(livePayload);
            this.commentService.resetCommentsLive();
            this.transactionCreditService.resetTransactionCreditsIncomeLiveUser();
            this.transactionCreditService.resetTransactionCreditIcomeLiveUserSum();

            const userID = this.authService.user()?._id!;
            const { MyParticipant, OtherParticipants, UserTransmitter } = this.liveStreamService.getParticipantRole(livePayload, userID);
            this.MyParticipant.set(MyParticipant);
            this.UserTransmiter.set(UserTransmitter);
            this.UsersSpectator.set(OtherParticipants);
            this.role.set(MyParticipant?.liveRole || 'audience');

            if (livePayload.transmissionType === 'STREAMING' && livePayload.status === 'ACTIVE') {
              this.initLiveStream(livePayload.liveRoomId!);
            }

          }

          this.loading = false;
          this.spinnerService.close();
        },
        error: () => {
          this.loading = false;
          this.spinnerService.close();
          this.onReturnProfile();
        }
      });
  }

  initLiveStream(liveRoomId: string) {
    this.roomID = liveRoomId;
    this.userOnlineSocket();
    this.joinRoom();
  }
  // live
  async onStopLiveStream() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.router.navigateByUrl(`/${user.username}`);
      return;
    }

    const data = {
      transmissionType: 'STREAMING',
      live: false
    };

    this.spinnerService.start();
    this.liveStreamService.handleLiveStreamStatus(data).subscribe({
      next: (res) => {
        if (res) {
          this.liveStreamService.resetLiveStream();
          this.router.navigateByUrl(`/${user.username}`);
        }
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

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.role() === 'transmitter') {
      // Al retornar un valor, el navegador muestra la alerta nativa: "¿Seguro que quieres salir?"
      // Esto detiene el F5 en seco y le da la opción al streamer de cancelar.
      $event.returnValue = true;
    }
  }

  async joinRoom() {
    try {
      this.spinnerService.start();

      const userID = this.authService.user()?._id!;
      const roomID = this.roomID;
      const userName = this.authService.user()?.username!;
      const esTransmisor = this.role() === 'transmitter';

      this.zegoCloudService.generateToken2({ roomID, userID, esTransmisor })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (res) => {
            const token = res.token;
            const roomConfig: ZegoRoomConfig = { userUpdate: true };
            const user: ZegoUser = { userID, userName };

            const isLoginSuccess = await this.zgEngine.loginRoom(roomID, token, user, roomConfig);

            if (isLoginSuccess) {
              this.streamID = `${roomID}_${this.liveStreamService.liveStream()?.User?._id}`;

              if (this.role() === 'transmitter') {
                const result = await this.zgEngine.checkSystemRequirements();
                if (!result.webRTC) {
                  this.toastService.start({ type: 'error', message: 'Device not supported' });
                  return;
                }
                await this.startTransmitterStream();


              } else if (this.role() === 'audience') {
                this.viewRemote.set(true);
                this.onStartWatchingStream(); // Auto sintonizar al entrar
              }
            } else {
              this.toastService.start({ type: 'error', message: 'Error joining room' });
            }
            this.spinnerService.close();
          }
        });
      this.setupEventListeners();
    } catch (error) {
      this.spinnerService.close();
      this.toastService.start({ type: 'error', message: 'Error joining room' });
    }
  }

  // events
  setupEventListeners() {
    this.zgEngine.on('roomStateUpdate', (roomID, state) => {
      this.roomState.set(state);
    });

    this.zgEngine.on('roomUserUpdate', (roomID, updateType, userList) => {
      if (updateType === 'ADD') {
        userList.forEach((user) => {
          if (!this.userList().some((u) => u.userID === user.userID)) {
            this.userList.update((users) => [...users, { userID: user.userID, userName: user.userName! }]);
            this.addJoinMessage(user.userName!);
          }
        });
      } else if (updateType === 'DELETE') {
        userList.forEach((user) => {
          this.userList.update((users) => users.filter((u) => u.userID !== user.userID));
          this.addLeaveMessage(user.userName!);
        });
      }
    });

    this.zgEngine.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
      if (updateType === 'ADD') {
        for (const stream of streamList) {
          const remoteStream = await this.zgEngine.startPlayingStream(stream.streamID);
          const viewRemote = this.zgEngine.createRemoteStreamView(remoteStream);
          viewRemote.play("remote-video");
          this.viewRemote.set(true);
        }
      } else if (updateType === 'DELETE') {
        streamList.forEach((stream) => {
          this.zgEngine.stopPlayingStream(stream.streamID);
          if (stream.streamID === this.streamID) {
            this.viewRemote.set(false);
          }
        });
      }
    });

    this.zgEngine.on('publisherStateUpdate', result => {
      this.publisherState.set(result.state);
    });

    this.zgEngine.on('playerStateUpdate', result => {
      this.publisherStateNotification.set(result.state);
    });

    this.zgEngine.on('IMRecvBarrageMessage', (roomID, chatData) => {
      const messageJson: CommentLive = JSON.parse(chatData[0].message);
      const message: CommentLive = {
        ID: 'zego' + chatData[0].fromUser.userID + chatData[0].sendTime,
        name: messageJson.name,
        avatar: messageJson.avatar,
        time: this.formatTime(chatData[0].sendTime),
        content: messageJson.content,
      };

      const currentCommnets = this.commentService.commentsLive();
      if (!currentCommnets.some(existing => existing.ID === message.ID)) {
        this.commentService.addCommentsLive([...currentCommnets, message].slice(-30));
      }

      if (this.isUserNearBottom) {
        setTimeout(() => this.scrollToBottom(), 50);
      }

    });
  }

  // start transmitter
  async startTransmitterStream() {
    this.viewLocal.set(true);
    await this.checkMediaDevices();

    const option = { videoBitrate: 300, audioBitrate: 48 };
    this.localStream = await this.zgEngine.createZegoStream(option);

    await this.zgEngine.setEffectsBeauty(this.localStream, true, {
      sharpenIntensity: 50, whitenIntensity: 50, rosyIntensity: 50, smoothIntensity: 50
    });

    this.localStream.playVideo(this.localVideo.nativeElement);
    this.localStream.setVolume(100);
    this.zgEngine.startPublishingStream(this.streamID, this.localStream, { videoCodec: 'VP8' });
  }

  // start watch stream
  onStartWatchingStream() {
    if (this.role() === 'audience') {
      this.zgEngine.startPlayingStream(this.streamID)
        .then((remoteStream) => {
          const viewRemote = this.zgEngine.createRemoteStreamView(remoteStream);
          viewRemote.play('remote-video', { enableAutoplayDialog: false });
          this.viewRemote.set(true);
        })
        .catch(() => {
          this.toastService.start({ type: 'error', message: 'Could not connect to live stream' });
        });
    }
  }

  userOnlineSocket() {
    if (!this.socketService.socket) {
      this.socketService.connect();
    }

    // tip_received
    this.socketService
      .onTipReceived()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const transactionCredit: TransactionCredit = data.TransactionCredit;
        this.transactionCreditService.addTransactionCreditsIncomeLiveUser([transactionCredit, ...this.transactionCreditService.transactionCreditsIncomeLiveUser()]);

        const sumCreditAmount = Number(this.transactionCreditService.transactionCreditIcomeLiveUserSum()?.sumCreditAmount || 0);
        const sum = Number(transactionCredit.creditAmount) + sumCreditAmount;

        if (sumCreditAmount === 0) {
          this.transactionCreditService.addTransactionCreditIcomeLiveUserSum({ sumCreditAmount: sum });
        } else {
          this.transactionCreditService.updateTransactionCreditIcomeLiveUserSum({ sumCreditAmount: sum });
        }
      });

    // Monitoreo de estado
    this.socketService
      .onLiveStreamStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        if (data.status == 'ENDED') {
          this.liveStreamService.updateLiveStream({
            live: false,
            status: data.status,
          });
          this.showComments = false;
          this.toastService.start({ type: 'info', message: 'theLiveStreamHasEnded' });
          this.logoutRoom();
        }
      });
  }

  detachSocketEvents() {
    if (!this.socketService.socket) return;
  }

  async onLogoutRoom() {
    await this.logoutRoom();
    this.onStopLiveStream();
    //this.router.navigate(['/', this.authService.user()?.username]);
  }

  async logoutRoom() {
    // 1. Si no hay motor o ya se limpió la referencia, salimos inmediatamente
    if (!this.zgEngine) {
      return;
    }

    try {
      // Guardamos la referencia local y limpiamos la de la clase 
      // para evitar que reentradas duplicadas (ej: ngOnDestroy) ejecuten esto a la vez
      const engine = this.zgEngine;

      // Al setearlo en null, cualquier otra llamada paralela morirá en el 'if' de arriba
      this.zgEngine = null!;

      // 2. Detener la publicación y la reproducción de forma explícita
      if (this.streamID) {
        try {
          engine.stopPublishingStream(this.streamID);
          engine.stopPlayingStream(this.streamID);
        } catch (e) {
          console.warn("Los streams ya estaban detenidos:", e);
        }
      }

      // 3. Apagar físicamente el hardware y vaciar memoria de tracks
      if (this.localStream) {
        try {
          await engine.setEffectsBeauty(this.localStream, false);

          const nativeStream: MediaStream | undefined = this.localStream?.stream;
          if (nativeStream && typeof nativeStream.getTracks === 'function') {
            nativeStream.getTracks().forEach(track => {
              if (track) {
                track.stop();
                track.enabled = false;
              }
            });
          }
        } catch (streamErr) {
          console.warn("Error silenciado al apagar tracks:", streamErr);
        }

        try {
          engine.destroyStream(this.localStream);
        } catch (e) {
          console.warn("El stream ya estaba destruido en el SDK:", e);
        }
        this.localStream = null;
      }

      // 4. Salir de la sala si no estábamos desconectados
      if (this.roomState() !== 'DISCONNECTED' && this.roomID) {
        try {
          engine.logoutRoom(this.roomID);
        } catch (e) {
          console.warn("Error al intentar desloguear de la sala:", e);
        }
      }

      // 5. Destruir el Engine de forma segura envolviéndolo en su propio try/catch
      try {
        engine.destroyEngine();
      } catch (engineErr) {
        console.warn("El motor de Zego ya se encontraba destruido:", engineErr);
      }

    } catch (e) {
      console.error("Error crítico durante el desmantelamiento de la sala:", e);
    } finally {
      this.viewLocal.set(false);
      this.viewRemote.set(false);
    }
  }

  onStopLive() {
    this.zgEngine.stopPublishingStream(this.streamID);
    this.toastService.start({ type: 'info', message: 'Transmisión pausada' });
  }

  async onReactivateLive() {
    if (this.role() === 'transmitter') {
      if (!this.localStream) {
        this.localStream = await this.zgEngine.createZegoStream({ videoBitrate: 300, audioBitrate: 48 });
        this.localStream.playVideo(this.localVideo.nativeElement);
      }
      this.zgEngine.startPublishingStream(this.streamID, this.localStream, { videoCodec: 'VP8' });
      this.toastService.start({ type: 'success', message: 'Transmisión reanudada' });

    } else if (this.role() === 'audience') {
      // Opción de reenganche manual para un espectador si sufre lag
      const remoteStream = await this.zgEngine.startPlayingStream(this.streamID);
      const viewRemote = this.zgEngine.createRemoteStreamView(remoteStream);
      viewRemote.play("remote-video", { enableAutoplayDialog: false });
    }
  }

  //++++++ MESSAGE++++++
  createFormCommentControls() {
    this.myFormComment = new FormGroup({ text: new FormControl(null, [Validators.required]) });
  }
  // enviar messages de difusion  todos
  async onSendBroadcastMessage() {
    try {
      const inputMessage = 'Este es un mensaje de difusion';

      const isSent = await this.zgEngine.sendBroadcastMessage(this.roomID, inputMessage)
      console.log('>>> sendMsg success,', isSent);
    } catch (error) {
      console.log('>>> sendMsg, error:', error);
    };
  }

  async onSendBarrageMessage() {
    if (this.myFormComment.invalid) return;

    try {
      const { text } = this.myFormComment.value;
      const message: CommentLive = {
        ID: this.authService.user()?._id! + Date.now(),
        name: this.authService.user()?.username! || 'User',
        avatar: this.authService.user()?.Profile?.length ? this.authService.user()?.Profile![0].cloudflare?.result?.variants?.[0] || null : null,
        content: text || '😏',
      };

      //this.showComments = true;
      this.myFormComment.reset();
      this.commentService.addCommentsLive([...this.commentService.commentsLive(), message]);
      setTimeout(() => this.scrollToBottom(), 30);

      await this.zgEngine.sendBarrageMessage(this.roomID, JSON.stringify(message));
    } catch (error) {
      console.error(error);
    }
  }

  // Métodos de UI complementarios (Emojis, scroll, layout)
  addJoinMessage(userName: string): void {
    const hasProfile = this.authService.user()?.Profile?.[0];
    const message = {
      ID: `join_${Date.now()}`,
      name: userName,
      time: this.formatTime(Date.now()),
      content: `has joined the live.`,
      avatar: this.getMediaDetails(hasProfile)?.url,
    };
    this.commentService.addCommentsLive([...this.commentService.commentsLive(), message]);
    this.scrollToBottom();
  }

  addLeaveMessage(userName: string): void {
    const hasProfile = this.authService.user()?.Profile?.[0];
    const message = {
      ID: `leave_${Date.now()}`,
      name: userName,
      time: this.formatTime(Date.now()),
      content: `has left the live.`,
      avatar: this.getMediaDetails(hasProfile)?.url,
    };
    this.commentService.addCommentsLive([...this.commentService.commentsLive(), message]);
    this.scrollToBottom();
  }

  //+++DEVICE
  async checkMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const video = devices.filter(d => d.kind === 'videoinput');
      const audio = devices.filter(d => d.kind === 'audioinput');
      if (video.length === 0 || audio.length === 0) throw new Error();
    } catch {
      this.toastService.start({ type: 'error', message: 'Camera or microphone not detected.' });
    }
  }

  async toggleCameraFacing(): Promise<void> {
    if (!this.localStream) return;

    this.spinnerService.start();
    try {
      // 1. Obtener todas las cámaras disponibles
      const videoDevices = await this.zgEngine.getCameras();

      if (videoDevices.length < 2) {
        this.toastService.start({ type: 'info', message: 'No se detectaron múltiples cámaras para alternar.' });
        this.spinnerService.close();
        return;
      }

      // 2. Averiguar cuál ID de cámara se está usando actualmente
      const currentTrack = this.localStream.getVideoTracks()[0];
      const currentSettings = currentTrack ? currentTrack.getSettings() : null;
      const currentDeviceID = currentSettings ? currentSettings.deviceId : null;

      // 3. Buscar la otra cámara que no sea la actual
      const nextDevice = videoDevices.find(device => device.deviceID !== currentDeviceID);

      if (nextDevice) {
        // 4. Cambiar el dispositivo en caliente sin cortar la transmisión
        await this.zgEngine.useVideoDevice(this.localStream, nextDevice.deviceID);
        this.toastService.start({ type: 'success', message: `${nextDevice.deviceName}` });
      }
    } catch (error) {
      console.error('Error alternando hardware de video:', error);
      this.toastService.start({ type: 'error', message: 'Fallo al conmutar dispositivos de captura.' });
    } finally {
      this.spinnerService.close();
    }
  }

  toggleCamera(): void {
    if (this.localStream) {
      const track = this.localStream.getVideoTracks()[0];
      if (track) track.enabled = !track.enabled;
    }
  }

  toggleAudio(): void {
    if (this.localStream) {
      const track = this.localStream.getAudioTracks()[0];
      if (track) track.enabled = !track.enabled;
    }
  }

  async toggleAudienceAudio(): Promise<void> {
    if (this.role() !== 'audience') return;

    try {
      const targetMuteState = !this.isAudienceMuted();
      await this.zgEngine.mutePlayStreamAudio(this.streamID, targetMuteState);
      this.isAudienceMuted.set(targetMuteState);

    } catch (error) {
      this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
    }
  }

  playSoundTip() { new Audio('public/sounds/scale.mp3').play().catch(() => { }); }

  //+++TIP+++
  onTip() {
    this.tipService.addTip(
      {
        type: 'TIP_LIVE',
        LiveStreamId: this.liveStreamService.liveStream()?._id!,
        user: this.UserTransmiter()!
      });
    this.onTipModal();
  }

  findIncomeLive() {

    this.dialogService.toggleModal('transactionCreditsReceivedModal');
    this.currentPageIncome = 0;
    this.hasMoreIncome = true;

    this.loading = true;
    const LiveStreamId = this.liveStreamService.liveStream()?._id!;
    const data = {
      LiveStreamId,
      status: "ACCEPT"
    };
    this.transactionCreditService.findIncomeTransactionCreditLiveUser(data, this.limitPageIncome, this.currentPageIncome)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.transactionCreditService.resetTransactionCreditsIncomeLiveUser();
          this.transactionCreditService.resetTransactionCreditIcomeLiveUserSum();
          if (res && res.data.length > 0) {
            if (this.currentPageIncome === 0) {
              this.totalPagesIncome = Number(res.total);
            }
            this.transactionCreditService.addTransactionCreditIcomeLiveUserSum({
              sumCreditAmount: res.sumCreditAmount, sumAmount: res.sumAmount,
            });

            const currentItems = this.transactionCreditService.transactionCreditsIncomeLiveUser();
            const newPosts = res.data.filter((newPost: any) => !currentItems.some(existing => existing._id === newPost._id));
            this.transactionCreditService.addTransactionCreditsIncomeLiveUser([...currentItems, ...newPosts]);
            this.hasMoreIncome = this.currentPageIncome <= this.totalPagesIncome;

            const money: Money = (this.transactionCreditService.transactionCreditsIncomeLiveUser()[0] as any).Money!
            this.money.set(money);

          } else {
            this.hasMoreIncome = false;
          }
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  //++++++EMOJI++++++
  toggleEmoji() {
    this.activeMenu.update(current => current === 'emojiContainer' ? null : 'emojiContainer');
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    const textProp = this.myFormComment.get('text');
    textProp?.setValue((textProp.value || '') + emoji);
    this.activeMenu.set(null);
    this.showEmojiPicker = false;
  }

  selectTabEmoji(index: number): void { this.emojiSelectedTab = index; }

  //++++++DOCUMENT++++++
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.showEmojiPicker && this.emojiContainer && !this.emojiContainer.nativeElement.contains(target)) this.showEmojiPicker = false;

    if (this.activeMenu() && !target.closest('.rounded-full') && !target.closest('.menu-container')) {
      this.activeMenu.set(null);
    }

    if (this.activeMenu() === 'emojiContainer') {
      const clickedInsidePanel = target.closest('.emoji-container');
      const clickedToggleButton = target.closest('#text + button') || target.closest('.fa-face-grin'); // Detecta el botón de la carita

      if (!clickedInsidePanel && !clickedToggleButton) {
        this.activeMenu.set(null);
        this.showEmojiPicker = false;
      }
      return; // Salimos para evitar interferencias
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const inputElement = document.getElementById('text') as HTMLInputElement;
    if (!inputElement) return;

    if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement !== inputElement) return;
    if (document.activeElement !== inputElement) inputElement.focus();

    if (this.allowedCharacters.test(key) || key === ' ') {
      const current = this.myFormComment.get('text')?.value || '';
      this.myFormComment.get('text')?.setValue(current + key);
      event.preventDefault();
    }

    if (key === 'Backspace') {
      const current = this.myFormComment.get('text')?.value || '';
      const graphemes = this.splitter.splitGraphemes(current);
      this.myFormComment.get('text')?.setValue(graphemes.slice(0, -1).join(''));
      event.preventDefault();
    }
  }

  onReturnProfile(): void {
    this.logoutRoom();
    this.router.navigate(['/', this.liveStreamService.liveStream()?.User?.username]);
  }

  onShareProfile() {
    if (navigator.share) {
      navigator.share({
        title: this.liveStreamService.liveStream()!.User?.username!,
        text: `Hi 🤗`,
        url: `https://live/${environment.domain}/${this.liveStreamService.liveStream()!.User?.username}`
      }).catch(console.error);
    }
  }

  //+++SCROLL+++   
  scrollToBottom() {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
      this.showScrollButton = false;
      this.isUserNearBottom = true; // Sincronizamos el estado
    }
  }

  onScroll() {
    if (!this.messagesContainer) return;
    const container = this.messagesContainer.nativeElement;

    // Margen de tolerancia de 30px para detectar el fondo de manera elástica
    this.isUserNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 30;
    this.showScrollButton = !this.isUserNearBottom;
    this.isUserScrolling = container.scrollTop < this.lastScrollTop;
    this.lastScrollTop = container.scrollTop;
  }

  // Detecta cuando el usuario deja de interactuar con el scroll
  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onScrollEnd() { setTimeout(() => { this.isUserScrolling = false; }, 100); }

  //+++COMPONENTS+++
  onCreditPurchase() {
    this.clearCreditPurchaseComponent();
    const componentRef = this.viewContainerRef.createComponent(CreditPurchaseComponent);
    this.creditPurchaseComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearCreditPurchaseComponent();
      this.dialogService.closeModal();
    });
    this.dialogService.toggleModal('creditPurchase');
  }

  private clearCreditPurchaseComponent() {
    if (this.creditPurchaseComponentRef) {
      this.creditPurchaseComponentRef.destroy();
      this.creditPurchaseComponentRef = null;
    }
  }

  onTipModal() {
    this.clearTipComponent();
    const componentRef = this.viewContainerRef.createComponent(TipComponent);
    this.tipComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearTipComponent();
      this.dialogService.closeModal();
    });
    this.dialogService.toggleModal('tipCredit');
  }

  private clearTipComponent() {
    if (this.tipComponentRef) {
      this.tipComponentRef.destroy();
      this.tipComponentRef = null;
    }
  }

  // menu
  onMoreToogle() { this.showMore.set(!this.showMore()); }

  get moreMenuItems(): DropdownMenuItem[] {
    const isPublishing = this.publisherState() === 'PUBLISHING';
    return [
      {
        label: isPublishing ? 'stopLive' : 'reactivateLive',
        icon: isPublishing ? 'stop-solid' : 'play-solid',
        color: isPublishing ? 'text-red-400' : 'text-emerald-400',
        action: () => isPublishing ? this.onStopLive() : this.onReactivateLive(),
        visible: this.role() === 'transmitter'
      },
      {
        label: 'changeCamera',
        icon: 'cameraswitch-regular',
        action: () => this.toggleCameraFacing(),
        visible: this.role() === 'transmitter'
      },
      {
        label: 'microphone',
        icon: this.localStream?.getAudioTracks()?.[0]?.enabled ? 'microphone-solid' : 'microphone-slash-solid',
        action: () => this.toggleAudio(),
        visible: this.role() === 'transmitter'
      },
      {
        label: this.isAudienceMuted() ? 'activateSound' : 'muteSound',
        icon: this.isAudienceMuted() ? 'microphone-slash-solid' : 'microphone-solid',
        action: () => this.toggleAudienceAudio(),
        visible: this.role() === 'audience'
      },
      {
        label: this.showComments ? 'hideChat' : 'viewChat',
        icon: this.showComments ? 'chat-off-regular' : 'messages-regular',
        action: () => this.showComments = !this.showComments,
        visible: true
      },
      {
        label: 'finishLive',
        icon: 'logout-solid',
        color: 'text-red-400',
        action: () => this.onLogoutRoom(),
        visible: this.role() === 'transmitter'
      },
      {
        label: 'leave',
        icon: 'logout-solid',
        color: 'text-red-400',
        action: () => this.onReturnProfile(),
        visible: this.role() === 'audience'
      }
    ];
  }

  // 3. Creamos los datos del Segundo Menú (Herramientas Avanzadas)
  get toolsMenuItems(): DropdownMenuItem[] {
    return [
      {
        label: 'Visualizar Chat',
        icon: 'comments-regular',
        action: () => this.showComments = !this.showComments,
        visible: true
      },
      {
        label: 'Enviar Regalo',
        icon: 'gift-regular',
        color: 'text-amber-400',
        action: () => this.onTip(),
        visible: this.role() === 'audience'
      }
    ];
  }

  toggleMenu(menuName: string) {
    this.activeMenu.update(current => current === menuName ? null : menuName);
  }

  //utilities
  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }

  getFirstLetter(name: string): string { return this.toolsService.getFirstLetter(name); }
  getMediaDetails(item: any): PostMediaDetails | null { return this.postMediaService.getBackgroundImageUrl(item); }

  //  input class
  inputClass(formGroup: FormGroup, controlName: string,) {
    return Tools.inputClass(formGroup, controlName);
  }

  buttonSecondaryClass() {
    return Tools.buttonSecondaryClass();
  }

  buttonClass() {
    return Tools.buttonClass();
  }

  cardModalClass() {
    return Tools.cardModalClass();
  }

  modalClass() {
    return Tools.modalClass();
  }
}