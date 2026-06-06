import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ApplicationRef, Component, ComponentRef, computed, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, HostListener, inject, PLATFORM_ID, signal, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { environment } from '@environments/environment';
import { CommentLive } from '@interfaces/comment';
import { User, UserVideoCallRequest } from '@interfaces/user';
import { ModalLoginAuthComponent } from '@layout/auth/pages/modal-login-auth/modal-login-auth.component';
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
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import { TipComponent } from '@shared/tip/tip.component';
import { BehaviorSubject, filter, first, Subject, takeUntil } from 'rxjs';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc'
import GraphemeSplitter from 'grapheme-splitter';
import { AutoResizeTextareaDirective } from '@directive/auto-resize-textarea.directive';
import { ZegoRoomConfig, ZegoSwitchRoomConfig, ZegoUser } from 'zego-express-engine-webrtc/sdk/code/zh/ZegoExpressEntity.rtm';
import { config } from 'process';
import { TransactionCredit } from '@interfaces/transactionCredit';
import { IconDirective } from '@directive/coin-svg.directive';
import { DateAgoPipe } from '@pipes/date-ago.pipe';
import { ToolsService } from '@services/tools.service';
import { LiveStreamService } from '@services/live-stream.service';
import { Tools } from '@core/common/tools';
import { Money } from '@interfaces/money';
import { PostMediaDetails } from '@interfaces/postMedia';
import { PostMediaService } from '@services/post-media.service';
import { DropdownMenuItem } from '@interfaces/tools';

@Component({
  selector: 'app-video-call-profile',
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
  templateUrl: './video-call-profile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './video-call-profile.component.scss'
})
export default class VideoCallProfileComponent {

  isBrowser: boolean;
  isServer: boolean;
  loading: boolean;
  isStable: boolean;
  showComments: boolean = false;

  showEmojiPicker = false;

  emojis: any = {
    '😀': [ //faces
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
      "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
      "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮",
      "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓",
      "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺",
      "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣",
      "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈",
      "👿", "💀", "☠️", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"
    ],
    '👋': [  // hands
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "🖕", "👍", "👎",
      "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏",
      "✍️", "💅", "🤳", "💪", "🦾", "🦵", "🦿", "🦶", "👣"
    ],
    '🙈': [ //animals
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒",
      "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇",
      "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞",
      "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢"
    ],
    '🍉': [ //food
      "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏",
      "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🍅", "🫒", "🥥", "🥑",
      "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄",
      "🧅", "🍄", "🥜", "🫘", "🌰", "🍞", "🥐", "🥖", "🫓", "🥨",
      "🥯", "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟",
      "🍕", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥗", "🥘",
      "🫕", "🍝", "🍜", "🍲", "🍛", "🍣", "🍤", "🥟", "🦪", "🍥"
    ],
    '❤️': [ //symbols
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️",
      "☪️", "🕉️", "☸️", "✡️", "🔯", "☯️", "☦️", "🛐", "⛎", "♈",
      "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒",
      "♓", "🆔", "⚛️", "🈳", "🈹", "☢️", "☣️", "🚭", "❗", "❓"
    ],
  };

  emojiCategories: any = Object.keys(this.emojis);
  emojiSelectedTab = 0;
  private allowedCharacters = /^[a-zA-Z0-9\s]$/;

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  @ViewChild('localVideo', { static: true }) localVideo!: ElementRef;
  @ViewChild('remoteVideo', { static: true }) remoteVideo!: ElementRef;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('emojiContainer') emojiContainer!: ElementRef;
  @ViewChild('moreContainer') moreContainer!: ElementRef;

  @ViewChild(AutoResizeTextareaDirective) autoResizeTextarea!: AutoResizeTextareaDirective;

  private destroy$ = new Subject<void>();
  public roomState = signal<string>('DISCONNECTED'); // Estado inicial
  public publisherState = signal<string>('NO_PUBLISH'); // Estado inicial
  public publisherStateNotification = signal<string>('');
  public transmissionType = signal<string>('VIDEOCALL');

  private zgEngine!: ZegoExpressEngine;
  //private zgEngine: any;

  private appID: number = environment.zegocloudAppID; // Reemplaza con tu appID
  private server: string = environment.zegoCloudServer; // Reemplaza con tu servidor

  liveRoomId: null | string;
  idChat: null | string;

  role = signal<string>('none'); // Define si es 'transmitter' o 'audience'
  streamID: string;
  roomID: string;
  localStream: any;
  public messageList: Array<any> = [];
  public userList = signal<Array<{ userID: string; userName: string }>>([]);

  private captureInterval: any;

  viewLocal = signal(false);
  viewRemote = signal(false);
  public videoCall = signal(false);

  showMore = signal(false);

  //message
  myFormComment: FormGroup;

  isWatchingStream = false;

  private splitter = new GraphemeSplitter(); // Instancia de GraphemeSplitter

  // scroll
  private isUserNearBottom = true;
  showScrollButton = false;
  private isUserScrolling = false; // Indica si el usuario está interactuando con el scroll
  private lastScrollTop = 0; // Guarda la última posición del scroll

  // components
  private tipComponentRef: ComponentRef<TipComponent> | null = null;
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;

  // transaction
  totalPagesIncome: number = 0;
  currentPageIncome = 0;
  limitPageIncome = 10;
  hasMoreIncome: boolean = true;

  public activeMenu = signal<string | null>(null);
  public activEemoji = signal<string | null>(null);
  private isIntentionallyLeaving = false;
  public money = signal<Money | null>(null);

  public UserTransmiter = signal<User | null>(null);
  public UsersSpectator = signal<User[]>([]);
  public MyParticipant = signal<User | null>(null);

  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService);
  private zegoCloudService = inject(ZegoCloudService);
  private spinnerService = inject(SpinnerService);
  public userService = inject(UserService);
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

      if (!this.authService.user()) {
        this.router.navigate(['/']);
      }

      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          takeUntil(this.destroy$)
        )
        .subscribe((event: NavigationEnd) => {
          const urlSegments = event.urlAfterRedirects.split('/');
          const isStreaming = urlSegments.includes('live') ? 'live' : null;
          const isVideoCall = urlSegments.includes('videocall') ? 'videocall' : null;

          if (!this.userService.userVideoCallRequest() &&
            this.userService.userVideoCallRequest()?.roomID &&
            this.userService.userVideoCallRequest()?.Callee?._id &&
            this.userService.userVideoCallRequest()?.Caller?._id) {
            this.router.navigate(['/']);
          }
        });

      this.activatedRoute.paramMap.subscribe(async (params) => {
        this.liveRoomId = params.get('liveRoomId');
        this.idChat = params.get('idChat');


        if (!this.liveRoomId) {
          this.router.navigate(['/']);
        }

        this.findActiveLiveStream();

      });

    }
  }

  async ngOnInit() {
    if (this.isBrowser) {
      this.createFormCommentControls();
    }
  }

  async ngOnDestroy() {
    if (this.isBrowser) {
      this.destroy$.next();
      this.destroy$.complete();

      this.logoutRoom();

      // Desconectar eventos de socket
      this.detachSocketEvents();

      // components
      this.clearCreditPurchaseComponent();
      this.clearTipComponent();

      // reset 
      //this.userService.resetUserProfile();
      this.transactionCreditService.resetTransactionCreditsIncomeLiveUser();
    }
  }

  findActiveLiveStream() {

    this.spinnerService.start();
    this.loading = true;

    const data = {
      liveRoomId: this.liveRoomId,
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
            const { MyParticipant, OtherParticipants, UserTransmitter } =
              this.liveStreamService.getParticipantRole(livePayload, userID);
            this.MyParticipant.set(MyParticipant);
            this.UserTransmiter.set(UserTransmitter);
            this.UsersSpectator.set(OtherParticipants);
            this.role.set(MyParticipant?.liveRole || 'audience');

            if (livePayload.transmissionType === 'VIDEOCALL' && livePayload.status === 'ACTIVE') {
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
      transmissionType: 'VIDEOCALL',
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

  // @HostListener('window:beforeunload', ['$event'])
  // unloadNotification($event: any): void {
  //   if (this.role() === 'transmitter') {
  //     // Al retornar un valor, el navegador muestra la alerta nativa: "¿Seguro que quieres salir?"
  //     // Esto detiene el F5 en seco y le da la opción al streamer de cancelar.
  //     $event.returnValue = true;
  //   }
  // }

  async joinRoom() {
    try {

      this.spinnerService.start();

      const roomID = this.roomID;
      const userID = this.authService.user()?._id! || 'userId' + new Date().getTime();
      const userName = this.authService.user()?.username || 'user' + new Date().getTime();

      const esTransmisor = this.role() === 'transmitter' ? true : false;

      this.zegoCloudService.generateToken2({ roomID, userID, esTransmisor })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (res) => {

            const token = res.token;

            const roomConfig: ZegoRoomConfig = {
              userUpdate: true,
            };

            // const roomConfig: ZegoSwitchRoomConfig = {
            //   token: token,
            //   isUserStatusNotify: true, 
            // };

            const user: ZegoUser = {
              userID: userID,
              userName: userName,
            };

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
                this.viewRemote.set(true);
                this.videoCall.set(true);

              } else if (this.role() === 'audience') {
                this.viewRemote.set(true);

                await this.startAudienceStream(); // Publicar el stream como "audience"
                this.viewLocal.set(true);
                this.videoCall.set(true);
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

  //events
  setupEventListeners() {
    const roomID = this.roomID;
    // estado de la transmision del usuario actual
    this.zgEngine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {

      this.roomState.set(state);

      if (state == 'DISCONNECTED') {
        // Disconnected from the room
        console.log(`Disconnected from the room`);
      }

      if (state == 'CONNECTING') {
        // Connecting to the room
        console.log(`Connecting to the room`);
      }

      if (state == 'CONNECTED') {
        // Connected to the room
        console.log(`Connected to the room`);
      }
    });

    // Room status update callback
    this.zgEngine.on('roomStateChanged', (roomID, reason, errorCode, extendData) => {

      this.roomState.set(reason);

      if (reason == 'LOGINING') {
        // Logging in.
      } else if (reason == 'LOGINED') {
        // Login successful.
        // Only after a user successfully logs in to a room or switches the room, can `startPublishingStream` and `startPlayingStream` be called to publish and play streams properly.
        // Publish streams to ZEGOCLOUD audio and video cloud.
      } else if (reason == 'LOGIN_FAILED') {
        // Login failed.
      } else if (reason == 'RECONNECTING') {
        // Reconnecting.
      } else if (reason == 'RECONNECTED') {
        // Reconnection successful.
      } else if (reason == 'RECONNECT_FAILED') {
        // Reconnection failed.
      } else if (reason == 'KICKOUT') {
        // Forced to log out of a room.
      } else if (reason == 'LOGOUT') {
        // Logout successful.
      } else if (reason == 'LOGOUT_FAILED') {
        // Logout failed.
      }
    });

    // estado de otros usuarios de la sala
    this.zgEngine.on('roomUserUpdate', (roomID, updateType, userList) => {

      if (updateType === 'ADD') {
        userList.forEach((user) => {
          if (!this.userList().some((u) => u.userID === user.userID)) {
            this.userList.update((users) => [...users, { userID: user.userID, userName: user.userName! }]);
            // Show input message
            this.addJoinMessage(user.userName!);
          }
        });
      } else if (updateType === 'DELETE') {
        userList.forEach((user) => {
          this.userList.update((users) => users.filter((u) => u.userID !== user.userID));
          // Optional: Show output message
          this.addLeaveMessage(user.userName!);
          this.checkIfActiveCallParticipantLeft(user.userID); // <--- NUEVA LÍNEA
        });
      }
    });

    // se adiciona o elimina cuando entra a la sala otros usuarios
    this.zgEngine.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
      if (updateType === 'ADD') {
        for (const stream of streamList) {
          //if (stream.streamID !== this.streamID) { // Evitar reproducir su propio stream
          const remoteStream = await this.zgEngine.startPlayingStream(stream.streamID);
          const viewRemote = this.zgEngine.createRemoteStreamView(remoteStream);
          viewRemote.play("remote-video");
          //}
        }
      } else if (updateType === 'DELETE') {
        streamList.forEach((stream) => {
          this.zgEngine.stopPlayingStream(stream.streamID);
        });

        // CONTROL CRÍTICO: Si se elimina el stream y eres la audiencia, significa que el transmisor cerró directo.
        // if (this.role() === 'audience') {
        //   setTimeout(() => {
        //     this.resetVideoCallStatus();
        //   }, 50);
        // }

        if (this.role() === 'transmitter') {
          this.onLogoutRoom();
        }
      }
    });

    // escuchar cuando se interrunpe la transmision
    this.zgEngine.on('publisherStateUpdate', result => {
      // Stream publishing status update callback
      var state = result['state']
      var streamID = result['streamID']
      var errorCode = result['errorCode']
      var extendedData = result['extendedData']

      this.publisherState.set(state);

    });

    // calidad de la transmision, resolucion de la transmicion, etc.
    this.zgEngine.on('publishQualityUpdate', (streamID, stats) => {
      // Callback for reporting stream publishing quality.
      // ... 
    });

    // cuando la transmision se interrumpe por problemas de red
    this.zgEngine.on('playerStateUpdate', result => {
      // Stream playing status update callback
      var state = result['state']
      var streamID = result['streamID']
      var errorCode = result['errorCode']
      var extendedData = result['extendedData']

      this.publisherStateNotification.set(state);

      // CONTROL CRÍTICO: Si el reproductor cambia a NO_PLAY de forma imprevista, sacamos al usuario al perfil.
      if (state === 'NO_PLAY' && this.role() === 'audience') {
        console.log('[ZegoCloud] Transmisión interrumpida o finalizada.');
        this.resetVideoCallStatus();
      }

    });

    // informar la calidad de reproduccion
    this.zgEngine.on('playQualityUpdate', (streamID, stats) => {
      // Callback for reporting stream playing quality.
    });

    // recibir mensajes de difusion
    this.zgEngine.on('IMRecvBroadcastMessage', (roomID, chatData) => {
      console.log('IMRecvBroadcastMessage', roomID, chatData);

      const message = {
        ID: 'zego' + chatData[0].fromUser.userID + chatData[0].sendTime,
        name: chatData[0].fromUser.userName,
        time: this.formatTime(chatData[0].sendTime),
        content: chatData[0].message + ' (broadcast sending)',
      };

      this.messageList = [...this.messageList, message];

      this.scrollToBottom();
    });

    // recibir mensajes de bombardeo
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

  // Agrega esta función de control en tu componente
  private checkIfActiveCallParticipantLeft(leftUserID: string) {
    // Verificamos si el usuario que se fue es el mismo con el que se tiene la llamada activa
    const activeCall = this.userService.userVideoCallRequest();
    alert(1)
    if (this.role() === 'transmitter' && activeCall) {
      // Si el ID del que salió coincide con el Caller (el cliente que inició la videollamada)
      if (activeCall.Caller?._id === leftUserID) {
        console.log('[VideoCall] El cliente de la videollamada se desconectó de forma abrupta.');

        this.toastService.start({
          type: 'info',
          message: 'El participante ha abandonado la llamada.'
        });

        // Forzamos el cierre y desmantelamiento de los streams locales para el transmitter
        this.resetVideoCallStatus();
      }
    }
  }

  // start transmitter
  async startTransmitterStream() {

    const sendData = {
      User: this.authService.user(),
      data: {
        online: true,
        videoCall: true,
        transmissionType: this.transmissionType()
      }
    };

    this.socketService.socket.emit('live-client', sendData);

    this.viewLocal.set(true);

    // After calling the createZegoStream method, you need to wait for the ZEGO server to return the local stream object before any further operation.

    await this.checkMediaDevices();

    let option: any = {
      videoBitrate: 300,
      audioBitrate: 48,

      //compartir pantalla
      // screen: {
      //   audio: false,
      //   video: {
      //     quality: 4,
      //     frameRate: 15,
      //     width: 1280,
      //     height: 720
      //   }
      // }
    }

    this.localStream = await this.zgEngine.createZegoStream(option);
    const enable = true;
    // Enable the face beautification.
    await this.zgEngine.setEffectsBeauty(
      this.localStream,
      enable,
      {
        sharpenIntensity: 50,
        whitenIntensity: 50,
        rosyIntensity: 50,
        smoothIntensity: 50
      }
    );

    // Play preview of the stream
    this.localStream.playVideo(this.localVideo.nativeElement);

    //this.localStream.localStream.playAudio(false);

    // volume: 0 ~ 100
    this.localStream.setVolume(100);

    // localStream is the MediaStream object created by calling creatStream in the previous step.
    // videoCodec:  The video codec for stream publishing, pass the [VP8] (string) or 'H264' (string). Default valus is [H264].
    this.zgEngine.startPublishingStream(this.streamID, this.localStream, { videoCodec: 'VP8' });

    //this.socketConnect();

    //this.captureVideoFrame(0);

    this.captureInterval = setInterval(() => {
      //this.captureVideoFrame(0);
    }, 600000); // 10 minutos en milisegundos
  }

  // start watch stream
  onStartWatchingStream() {
    if (this.role() === 'audience') {
      this.zgEngine.startPlayingStream(this.streamID)
        .then((remoteStream) => {
          const viewRemote = this.zgEngine.createRemoteStreamView(remoteStream);
          viewRemote.play('remote-video', { enableAutoplayDialog: false });
          this.isWatchingStream = true;
          this.viewRemote.set(true);
        })
        .catch(error => {
          console.error('Error al volver al stream en vivo:', error);
          this.toastService.start({ type: 'error', message: 'No se pudo conectar al stream en vivo' });
        });
    }
  }

  // socket
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

    // sound tip
    this.socketService
      .onCallRejectedByAudience()
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
        this.playSoundTip();
      });

    this.socketService.socket.emit('request_initial_online_users');
  }

  detachSocketEvents() {
    if (!this.socketService.socket) return;
  }

  async onLogoutRoom() {
    await this.logoutRoom();
    this.onStopLiveStream();
    this.router.navigate(['/', this.bigScreenUser()?.username]);
  }

  // logout room
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


  // stop live transmitter
  onStopLive() {
    this.zgEngine.stopPublishingStream(this.streamID);
    // zg.destroyStream(localStream)
    this.zgEngine.stopPlayingStream(this.streamID)

    const sendData = {
      User: this.authService.user(),
      data: {
        videoCall: false
      }
    };
  }

  // Reactivar el live transmitter
  async onReactivateLive() {
    if (this.role() === 'transmitter') {
      try {
        // Verifica si el stream local todavía existe
        if (!this.localStream) {
          // Si el stream fue destruido, vuelve a crearlo
          const option: any = {
            videoBitrate: 300,
            audioBitrate: 48,
          };
          this.localStream = await this.zgEngine.createZegoStream(option);

          // Reanuda la vista previa del stream local
          this.localStream.playVideo(this.localVideo.nativeElement);
        }

        // Reactiva la publicación del stream
        this.zgEngine.startPublishingStream(this.streamID, this.localStream, { videoCodec: 'VP8' });

        const roomID = this.roomID;
        this.socketService.socket.emit('live-status-client', { roomID, status: 'PUBLISHING' });

      } catch (error) {

      }
    } else if (this.role() === 'audience') {
      try {
        // Reactiva la reproducción del stream para los espectadores
        const remoteStream = await this.zgEngine.startPlayingStream(this.streamID);
        const viewRemote = this.zgEngine.createRemoteStreamView(remoteStream);
        viewRemote.play("remote-video", { enableAutoplayDialog: false });

      } catch (error) {

      }
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

  // enviar un mensaje de bombardeo
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

  // join message
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

  // check media device
  async checkMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');

      if (videoDevices.length === 0 || audioDevices.length === 0) {
        throw new Error('No camera or microphone devices were found.');
      }
    } catch (error) {
      this.toastService.start({
        type: 'error',
        message: 'The camera or microphone could not be detected. Check your devices.'
      });
      console.error('Error al enumerar dispositivos:', error);
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
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log(`Cámara ${videoTrack.enabled ? 'activada' : 'desactivada'}`);
      }
    }
  }

  toggleAudio(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log(`Audio ${audioTrack.enabled ? 'activado' : 'desactivado'}`);
      }
    }
  }

  playSoundTip() { new Audio('public/sounds/scale.mp3').play().catch(() => { }); }

  //+++TIP+++
  onTip() {
    this.tipService.addTip(
      {
        type: 'TIP_LIVE',
        LiveStreamId: this.liveStreamService.liveStream()?._id!,
        user: this.UsersSpectator()[0]
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

  // Escucha global para cualquier tecla presionada
  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const inputElement = document.getElementById('text') as HTMLInputElement;

    // Verificar si el enfoque está dentro de un input en un componente hijo
    const activeElement = document.activeElement;

    // Si el enfoque está en un input dentro de un componente hijo, no hacer nada
    if (activeElement && activeElement.tagName === 'INPUT' && activeElement !== inputElement) {
      return;
    }

    // Asegurarse de que el input tenga el foco
    if (inputElement && document.activeElement !== inputElement) {
      inputElement.focus();
    }

    // Permitir letras, números y espacios
    if (this.allowedCharacters.test(key) || key === ' ') {
      const currentValue = this.myFormComment.get('text')?.value || '';
      const newValue = currentValue + (key === ' ' ? ' ' : key); // Agregar espacio explícitamente
      this.myFormComment.get('text')?.setValue(newValue);

      // Coloca el caret al final del texto actualizado
      if (inputElement) {
        inputElement.selectionStart = inputElement.selectionEnd = newValue.length;
      }

      event.preventDefault(); // Evitar comportamiento predeterminado
    }

    // Manejar "Backspace"
    if (key === 'Backspace') {
      const currentValue = this.myFormComment.get('text')?.value || '';
      const graphemes = this.splitter.splitGraphemes(currentValue); // Dividir en graphemes
      const newValue = graphemes.slice(0, -1).join(''); // Eliminar el último grapheme
      this.myFormComment.get('text')?.setValue(newValue);

      // Coloca el caret al final del texto actualizado
      if (inputElement) {
        inputElement.selectionStart = inputElement.selectionEnd = newValue.length;
      }

      event.preventDefault(); // Evitar comportamiento predeterminado
    }
  }
  // return 
  onReturnProfile(): void {
    this.endVideoCall();
  }

  // shared username
  onShareProfile() {
    if (navigator.share) {
      navigator.share({
        title: this.smallScreenUser()?.username!,
        text: `Hi 🤗`,
        url: `https://${environment.domain}/${this.smallScreenUser()?.username}`
      })
        .then(() => console.log('Content shared successfully'))
        .catch((error) => console.log('Error al share:', error));
    } else {
      console.log('The Web Share API is not available in this browser');
    }
  }

  //+++SCROLL+++  
  scrollToBottom() {
    this.messagesContainer.nativeElement.scrollTo({
      top: this.messagesContainer.nativeElement.scrollHeight,
      behavior: 'smooth'
    });
    this.showScrollButton = false;
  }

  onScroll() {
    const container = this.messagesContainer.nativeElement;
    const threshold = 50;

    // Determina si el usuario está cerca del fondo
    this.isUserNearBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + threshold;

    // Muestra u oculta el botón de scroll
    this.showScrollButton = !this.isUserNearBottom;

    this.isUserScrolling = container.scrollTop < this.lastScrollTop;
    this.lastScrollTop = container.scrollTop;
  }

  // Detecta cuando el usuario deja de interactuar con el scroll
  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onScrollEnd() {
    setTimeout(() => {
      this.isUserScrolling = false; // Restablece el estado después de que el usuario termine de interactuar
    }, 100);
  }

  //+++COMPONENTS+++
  onCreditPurchase() {
    this.clearCreditPurchaseComponent();
    const componentRef = this.viewContainerRef.createComponent(CreditPurchaseComponent);
    this.creditPurchaseComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearCreditPurchaseComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
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
      this.clearTipComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
    });
    this.dialogService.toggleModal('tipCredit');
  }

  private clearTipComponent() {
    if (this.tipComponentRef) {
      this.tipComponentRef.destroy();
      this.tipComponentRef = null;
    }
  }

  // logout
  logout() {
    this.authService.logout();
  }

  // start audience
  async startAudienceStream() {

    try {
      const options = {
        videoBitrate: 300,
        audioBitrate: 48,
      };

      this.localStream = await this.zgEngine.createZegoStream(options);

      const streamID = `${this.roomID}_${this.authService.user()?._id}`; // Usar ID único

      // Publica el stream local
      this.zgEngine.startPublishingStream(streamID, this.localStream);

      // Muestra el video local
      this.localStream.playVideo(this.localVideo.nativeElement);

      this.viewLocal.set(true);
    } catch (error) {
      this.viewLocal.set(false);
      this.toastService.start({ type: 'error', message: 'Ocurrió un error al intentar acceder a tus dispositivos.' });
    }
  }

  // video call 
  async requestJoinCall() {

    if (this.role() === 'audience') {

      if (Number(0) <= Number(this.userCreditService.userCredit()!.current)) {
        const roomID = this.roomID;
        const Caller = this.authService.user()!;
        const Callee = this.userService.userProfile()!;

        const result = await this.zgEngine.checkSystemRequirements();
        if (!result.webRTC) {
          this.toastService.start({ type: 'error', message: 'Device not supported' });
          return;
        }

        const data = { roomID, Caller, Callee };

        this.userService.addUserVideoCallRequest(data);

        this.dialogService.toggleModal('modalRequestJoinCall');

        this.socketService.socket.emit('call_request_send', this.userService.userVideoCallRequest());

      } else {
        this.onCreditPurchase();
      }
    }
  }

  async endVideoCall() {
    this.resetVideoCallStatus();
  }

  // --- FUNCIÓN AUXILIAR PARA LIMPIAR SOLO LA LLAMADA Y MANTENER EL LIVE ---
  // --- FINALIZAR VIDEOLLAMADA Y REDIRIGIR AL PERFIL DE ORIGEN ---
  async resetVideoCallStatus() {
    try {
      // 1. COMPORTAMIENTO PARA LA AUDIENCIA (El que inició o entró a la llamada)
      if (this.role() === 'audience') {
        const audienceStreamID = `${this.roomID}_${this.authService.user()?._id}`;

        // Detener streams de Zego usando encadenamiento opcional seguro (?.)
        try {
          this.zgEngine?.stopPublishingStream(audienceStreamID);
        } catch (e) {
          console.warn("La publicación ya estaba detenida:", e);
        }

        try {
          this.zgEngine?.stopPlayingStream(this.streamID);
        } catch (e) {
          console.warn("La reproducción ya estaba detenida:", e);
        }

        // Detener físicamente el hardware nativo antes de limpiar los elementos visuales
        if (this.localStream) {
          try {
            // Si el SDK expone los tracks nativos
            const nativeStream: MediaStream | undefined = this.localStream?.stream;
            if (nativeStream && typeof nativeStream.getTracks === 'function') {
              nativeStream.getTracks().forEach(track => {
                if (track) {
                  track.stop();
                  track.enabled = false;
                }
              });
            }
            // Si el objeto localStream cuenta con el método stop directo
            if (typeof this.localStream.stop === 'function') {
              this.localStream.stop();
            }
          } catch (streamErr) {
            console.warn("Error al apagar tracks nativos de la audiencia:", streamErr);
          }
        }

        this.viewLocal.set(false);
        this.videoCall.set(false);

        // Salir de la sala si el motor aún existe
        if (this.zgEngine && this.roomState() !== 'DISCONNECTED') {
          try {
            this.zgEngine.logoutRoom(this.roomID);
          } catch (e) {
            console.warn("Error al desloguear de la sala:", e);
          }
        }

        this.toastService.start({ type: 'success', message: 'Llamada finalizada' });

        // Ejecutar la destrucción completa del Engine de manera segura
        await this.logoutRoom();

        // Redireccionar al home/perfil
        this.router.navigate(['/', this.UserTransmiter()?.username]);
      }

      // 2. COMPORTAMIENTO PARA EL TRANSMISOR (El Host/Modelo que recibió la llamada)
      else if (this.role() === 'transmitter') {
        try {
          this.zgEngine?.stopPlayingStream(this.streamID);
        } catch (e) {
          console.warn("El stream del reproductor ya estaba detenido:", e);
        }

        this.viewRemote.set(false);
        this.videoCall.set(false);

        this.toastService.start({ type: 'success', message: 'El usuario ha colgado' });

        // Desmantelamos la sala completa para el streamer
        await this.logoutRoom();
        this.router.navigate(['/']);
      }

      // Limpiar el estado de la solicitud actual
      this.userService.updateUserVideoCallRequest(null!);

    } catch (error) {
      console.error('Error durante el proceso de redirección al finalizar la llamada:', error);
      this.router.navigate(['/']);
    }
  }

  async captureVideoFrame(value: number) {
    const videoElement = this.localVideo.nativeElement.querySelector('video') as HTMLVideoElement;

    // Esperar hasta que el video esté listo
    const waitUntilReady = new Promise<void>((resolve, reject) => {
      const checkReadyState = () => {
        if (videoElement && videoElement.readyState >= 2) {
          resolve();
        } else {
          setTimeout(checkReadyState, 100); // Vuelve a intentar después de 100ms
        }
      };
      checkReadyState();
    });

    await waitUntilReady;

    // Crear un canvas para capturar el fotograma
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    }

    const base64Image = canvas.toDataURL('image/png');

    const fileName = `capture-${Date.now()}`
    const file = this.base64ToFile(base64Image, fileName);

    if (file) {

      if (value === 0) {
        // delete image 
        if (this.authService.user()?.liveCapture) {
          try {
            await this.cloudflareService.deleteStreamImage(this.authService.user()?.liveCapture.result.id);
          } catch (error) {

          }
        }

        const resImage = await this.cloudflareService.uploadToImageCloudflare(file);
        if (resImage !== null) {
          const sendData = {
            User: this.authService.user(),
            data: {
              liveCapture: resImage
            }
          };

          const userUpdate: any = this.authService.user();
          userUpdate.liveCapture = resImage;
          this.authService.addUser(userUpdate);
          this.socketService.socket.emit('live-capture-client', sendData);

          this.userService.updateUserProfile({
            liveCapture: resImage
          });

        }
      } else {
        this.toastService.start({ type: 'success', message: 'Captura de pantalla' });
        // Opcional: Descargar la imagen
        const link = document.createElement('a');
        link.href = base64Image;
        link.download = 'live-frame.png';
        link.click();

        // Retornar la URL base64 para usarla en otro lugar
        return base64Image;
      }
    }
    return base64Image;
  }

  base64ToFile(base64: string, fileName: string): File {
    try {
      // Dividir el Base64 para extraer el encabezado y los datos
      const [header, base64Data] = base64.split(',');

      if (!header || !base64Data) {
        throw new Error('Formato de Base64 inválido.');
      }

      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'; // Usa 'image/png' como predeterminado

      // Decodificar el Base64 en binario
      const binaryString = atob(base64Data);
      const byteNumbers = Array.from(binaryString, char => char.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);

      // Crear y devolver el archivo
      return new File([byteArray], fileName, { type: mimeType });
    } catch (error) {
      console.error('Error al convertir Base64 a File:', error);
      throw error;
    }
  }

  public bigScreenUser = computed(() => {
    if (this.role() === 'transmitter') {
      return this.UsersSpectator()[0] || null; // El espectador que entró a la llamada
    }
    return this.UserTransmiter(); // El transmisor al que estoy consultando
  });

  // 2. Quién figura en la miniatura flotante
  public smallScreenUser = computed(() => {
    return this.MyParticipant(); // Siempre tú mismo
  });

  // login
  onLogin() {
    const secretKey = 'your-secret-key'; // Cambia esto por una clave segura

    // Datos del usuario
    const userData = {
      route: `${this.userService.userProfile()?.username}/live`,
    };

    // Convertir datos a JSON y luego encriptar con XOR
    const jsonData = JSON.stringify(userData);
    const encryptedData = this.toolsService.xorEncryptDecrypt(jsonData, secretKey);

    // Codificar en Base64 para que sea seguro en la URL
    const encodedData = btoa(encryptedData);

    const urlSite = this.onUrlSite();
    const url = `${urlSite}/auto/login?data=${encodeURIComponent(encodedData)}`;

    this.router.navigateByUrl(`/auth/login?data=${encodeURIComponent(encodedData)}`);

    //window.open(`${url}`, "_parent", "noopener,noreferrer");
  }

  onUrlSite() {
    let urlSite = '';
    const domain = this.userService.userProfile()?.Site?.domain;

    if (environment.production) {
      urlSite = `${domain}`;
    } else {
      urlSite = domain === 'yuvinka.com' ? 'http://localhost:4200' : domain === 'fanspi.com' ? 'http://localhost:4201' : '';
    }
    return urlSite;

  }

  // date difference
  dateDifference(timestamp: number): string {
    const currentDate = new Date();
    const givenDate = new Date(timestamp);

    const timeDiff = givenDate.getTime() - currentDate.getTime();
    const daysDiff = Math.max(Math.floor(timeDiff / (1000 * 3600 * 24)), 0);

    return `${daysDiff}`;
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
        label: 'camera',
        icon: !this.localStream?.getVideoTracks()[0]?.enabled ? 'video-vamera-front-regular' : 'video-camera-front-off-regular',
        action: () => this.toggleCamera(),
        visible: this.role() === 'transmitter' || this.role() === 'audience'
      },
      {
        label: 'changeCamera',
        icon: 'cameraswitch-regular',
        action: () => this.toggleCameraFacing(),
        visible: this.role() === 'transmitter' || this.role() === 'audience'
      },
      {
        label: 'microphone',
        icon: this.localStream?.getAudioTracks()?.[0]?.enabled ? 'microphone-solid' : 'microphone-slash-solid',
        action: () => this.toggleAudio(),
        visible: this.role() === 'transmitter' || this.role() === 'audience'
      },
      // {
      //   label: this.isAudienceMuted() ? 'activateSound' : 'muteSound',
      //   icon: this.isAudienceMuted() ? 'microphone-slash-solid' : 'microphone-solid',
      //   action: () => this.toggleAudienceAudio(),
      //   visible: this.role() === 'audience'
      // },
      {
        label: this.showComments ? 'hideChat' : 'viewChat',
        icon: this.showComments ? 'chat-off-regular' : 'messages-regular',
        action: () => this.showComments = !this.showComments,
        visible: this.role() === 'transmitter' || this.role() === 'audience'
      },
      // {
      //   label: 'finishLive',
      //   icon: 'logout-solid',
      //   color: 'text-red-400',
      //   action: () => this.onLogoutRoom(),
      //   visible: this.role() === 'transmitter'
      // },
      // {
      //   label: 'leave',
      //   icon: 'logout-solid',
      //   color: 'text-red-400',
      //   action: () => this.onReturnProfile(),
      //   visible: this.role() === 'audience'
      // }
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
