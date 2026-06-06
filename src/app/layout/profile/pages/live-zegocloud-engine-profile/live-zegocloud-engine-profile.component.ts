import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ApplicationRef, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, HostListener, inject, PLATFORM_ID, signal, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc'
import GraphemeSplitter from 'grapheme-splitter';
import { AutoResizeTextareaDirective } from '@directive/auto-resize-textarea.directive';
import { ZegoRoomConfig, ZegoSwitchRoomConfig, ZegoUser } from 'zego-express-engine-webrtc/sdk/code/zh/ZegoExpressEntity.rtm';
import { config } from 'process';
import { TransactionCredit } from '@interfaces/transactionCredit';
import { IconDirective } from '@directive/coin-svg.directive';

@Component({
  selector: 'app-live-zegocloud-engine-profile',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    IconDirective,
    TranslateModule,
    RouterModule,
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
  ],
  templateUrl: './live-zegocloud-engine-profile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './live-zegocloud-engine-profile.component.scss'
})
export default class LiveZegocloudEngineProfileComponent {

  isBrowser: boolean;
  isServer: boolean;
  loading: boolean;
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
  @ViewChild('commentContainer') commentContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('emojiContainer') emojiContainer!: ElementRef;
  @ViewChild('moreContainer') moreContainer!: ElementRef;

  @ViewChild(AutoResizeTextareaDirective) autoResizeTextarea!: AutoResizeTextareaDirective;

  private destroy$ = new Subject<void>();
  public roomState = signal<string>('DISCONNECTED'); // Estado inicial
  public publisherState = signal<string>('NO_PUBLISH'); // Estado inicial
  public publisherStateNotification = signal<string>('');

  private zgEngine!: ZegoExpressEngine;
  private appID: number = environment.zegocloudAppID; // Reemplaza con tu appID
  private server: string = environment.zegoCloudServer; // Reemplaza con tu servidor

  slug: null | string;
  role = signal<string>('none'); // Define si es 'transmitter' o 'audience'
  streamID: string;
  roomID: string;
  localStream: any;
  public messageList: Array<any> = [];
  public userList: Array<{ userID: string; userName: string }> = [];

  online = signal(false);
  private captureInterval: any;

  viewLocal = signal(false);
  viewRemote = signal(false);
  public connectedUsersCount = signal<number>(0);
  public transactionCreditsReceivedAmount = signal<number>(0);
  public videoCall = signal(false);

  showMore = signal(false);

  //message
  myFormComment: FormGroup;

  isWatchingStream = false;

  private splitter = new GraphemeSplitter(); // Instancia de GraphemeSplitter

  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService);
  private zegoCloudService = inject(ZegoCloudService);
  private spinnerService = inject(SpinnerService);
  public userService = inject(UserService);
  private activatedRoute = inject(ActivatedRoute);
  private socketService = inject(SocketService);
  private applicationRef = inject(ApplicationRef);
  private cloudflareService = inject(CloudflareService);
  public dialogService = inject(DialogService);
  private tipService = inject(TipService);
  public router = inject(Router);
  public toastService = inject(ToastService);
  public userCreditService = inject(UserCreditService);
  public subscriptionService = inject(SubscriptionService);
  public transactionCreditService = inject(TransactionCreditService);
  public commentService = inject(CommentService);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    if (this.isBrowser) {

      if (!this.authService.user()) {
        this.router.navigate(['/']);
      }

      this.activatedRoute.paramMap.subscribe(async (params) => {
        this.slug = params.get('slug')

        if (!this.slug) {
          this.router.navigate(['/']);
        }

        this.userService.resetUserProfile();
        // Initialize the ZegoExpressEngine instance
        this.zgEngine = new ZegoExpressEngine(this.appID, this.server);

        this.findOne();
        if (this.authService.user()) {

        }
        this.commentService.resetCommentsLive();
        setTimeout(() => {
          this.scrollToBottomComments();
        }, 0);
      });
    }
  }

  async ngOnInit() {
    this.createFormCommentControls();
  }

  async ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.zgEngine.logoutRoom(this.slug || '');
    this.zgEngine.destroyEngine();

    // Disable the face beautification. 
    await this.zgEngine.setEffectsBeauty(this.localStream, false);

    if (this.authService.user()) {
      this.socketService.socket && this.detachSocketEvents();
    }

    this.onLogoutRoom();
  }

  // find one
  findOne() {
    this.spinnerService.start();
    this.loading = true;

    const data = {
      username: this.slug,
      User: this.authService.user()! ? this.authService.user()!._id : null,
    }

    this.userService.slug(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {

            this.userService.addUserProfile(res!.User);
            this.roomID = this.userService.userProfile()?.liveRoomId!;

            if (!this.roomID && this.userService.userProfile()?.liveStatus !== 'CONNECTED') {
              this.onReturnProfile();
            }

            this.joinRoom();

            this.online.set(this.userService.userProfile()?.online!);

            if (this.authService.user()) {
              if (!res.Subscription && (this.authService.user() && this.authService.user()!._id !== res.User._id)) {
                res.Subscription = {
                  expired: true
                };
              }
            } else {
              res.Subscription = {
                expired: true
              };
            }
          }
        },
        error: (err) => {
          this.loading = false;
          this.spinnerService.close();
        },
        complete: () => {
          this.loading = false;
          this.spinnerService.close();
          console.log('Request completed');
        }
      });
  }

  async joinRoom() {
    try {

      this.spinnerService.start();

      if (this.userService.userProfile()?._id === this.authService.user()?._id) {
        this.role.set('transmitter');
      } else {
        this.role.set('audience');
      }

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

              //this.streamID = `${roomID}_${userID}_stream_${Date.now()}`;
              this.streamID = `${roomID}_${this.userService.userProfile()?._id}`;

              if (this.role() === 'transmitter') {
                const result = await this.zgEngine.checkSystemRequirements();
                if (!result.webRTC) {
                  this.toastService.start({ type: 'error', message: 'Dispositivo no compatible' });
                  return;
                }

                await this.startTransmitterStream();

              }
              // audience
              else {
                if (this.authService.user()) {
                  this.socketConnect();
                }
                this.viewRemote.set(true);
              }

            } else {
              this.toastService.start({ type: 'error', message: 'Error al unirse a la sala' });
            }


          }
        });
      this.setupEventListeners();
    } catch (error) {
      this.spinnerService.start();
      this.toastService.start({ type: 'error', message: 'Error al unirse a la sala' });
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
          if (!this.userList.some((u) => u.userID === user.userID)) {
            this.userList.push({ userID: user.userID, userName: user.userName! });
          }
        });
      } else if (updateType === 'DELETE') {
        userList.forEach((user) => {
          this.userList = this.userList.filter((u) => u.userID !== user.userID);
        });
      }

      // Actualizar el contador de usuarios conectados
      this.connectedUsersCount.set(this.userList.length);
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

        if (this.userList.length === 0) {

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

      if (state == 'PUBLISHING') {
        console.log('Successfully published an audio and video stream:', streamID);
      } else if (state == 'NO_PUBLISH') {
        console.log('No audio and video stream published');
      } else if (state == 'PUBLISH_REQUESTING') {
        console.log('Requesting to publish an audio and video stream:', streamID);
      }
      console.log('Error code:', errorCode, ' Extra info:', extendedData)
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
      if (state == 'PLAYING') {
        console.log('Successfully played an audio and video stream:', streamID);
      } else if (state == 'NO_PLAY') {
        console.log('No audio and video stream played');
      } else if (state == 'PLAY_REQUESTING') {
        console.log('Requesting to play an audio and video stream:', streamID);
      }
      this.publisherStateNotification.set(state)
      console.log('Error code:', errorCode, ' Extra info:', extendedData)
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

      this.scrollToBottomComments();
    });

    // recibir mensajes de bombardeo
    this.zgEngine.on('IMRecvBarrageMessage', (roomID, chatData) => {
      console.log('IMRecvBarrageMessage', roomID, chatData);

      // Deserializar el mensaje
      const messageJson: CommentLive = JSON.parse(chatData[0].message);
      const message: CommentLive = {
        ID: 'zego' + chatData[0].fromUser.userID + chatData[0].sendTime,
        name: messageJson.name,
        avatar: messageJson.avatar,
        time: this.formatTime(chatData[0].sendTime),
        content: messageJson.content,
      };

      const currentCommnets = this.commentService.commentsLive();
      const newPosts = [message].filter((newItem: CommentLive) => {
        return !currentCommnets.some(existing => existing.ID === newItem.ID);
      });
      const updatedComments = [...currentCommnets, ...newPosts].slice(-30);
      this.commentService.addCommentsLive(updatedComments);

      // Esperar a que el DOM se actualice y luego hacer scroll
      setTimeout(() => {
        this.scrollToBottomComments();
      }, 0);

    });
  }

  // start transmitter
  async startTransmitterStream() {

    this.viewLocal.set(true);

    // After calling the createZegoStream method, you need to wait for the ZEGO server to return the local stream object before any further operation.

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

    this.socketConnect();

    const sendData = {
      User: this.authService.user(),
      data: {
        liveStatus: 'CONNECTED',
        live: true
      }
    };

    this.socketService.socket.emit('live-client', sendData);
    this.captureVideoFrame(0);

    this.captureInterval = setInterval(() => {
      this.captureVideoFrame(0);
    }, 600000); // 10 minutos en milisegundos
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

  // stop live transmitter
  onStopLive() {
    this.zgEngine.stopPublishingStream(this.streamID);
    // zg.destroyStream(localStream)
    this.zgEngine.stopPlayingStream(this.streamID)

    const sendData = {
      User: this.authService.user(),
      data: {
        live: false
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
        viewRemote.play("remote-video", { enableAutoplayDialog: true });

      } catch (error) {

      }
    }
  }

  // logout room
  async onLogoutRoom() {
    this.zgEngine.stopPublishingStream(this.streamID);
    await this.zgEngine.setEffectsBeauty(this.localStream, false);
    this.zgEngine.logoutRoom(this.roomID);

    const sendData = {
      User: this.authService.user(),
      data: {
        live: false
      }
    };
    this.socketService.socket.emit('live-client', sendData);

    // let urlSite = '';
    // const domain = this.userService.userProfile()?.Site?.domain;

    // if (environment.production) {
    //   urlSite = `${domain}`;
    // } else {
    //   urlSite = domain === 'yuvinka.com' ? 'http://localhost:4200' : domain === 'fanspi.com' ? 'http://localhost:4201' : '';
    // }

    // this.authService.logoutSite();

    // const url = `${urlSite}/${this.userService.userProfile()?.username}`;

    // window.open(`${url}`, "_parent", "noopener,noreferrer");
    this.role.set('');
    this.router.navigate(['/', this.authService.user()?.username]);
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

    if (this.myFormComment.invalid)
      return;

    try {
      const message: CommentLive = {
        ID: this.authService.user()?._id!,
        name: this.authService.user()?.username! || 'User',
        avatar: this.authService.user()?.Profile?.length ?
          this.authService.user()?.Profile![0].cloudflare?.result?.variants?.[0] || null
          : null,
        content: this.myFormComment.value.text || '😏',
      };

      // Serializar el mensaje como string
      const serializedMessage = JSON.stringify(message);

      // Enviar mensaje de bombardeo
      const isSent = await this.zgEngine.sendBarrageMessage(this.roomID, serializedMessage);

      this.myFormComment.reset();

      const currentCommnets = this.commentService.commentsLive();
      const updatedComments = [...currentCommnets, message];
      this.commentService.addCommentsLive(updatedComments);

      //this.autoResizeTextarea.resetTextareaHeight(); // Restablece la altura del textarea

      // Esperar a que el DOM se actualice y luego hacer scroll
      setTimeout(() => {
        this.scrollToBottomComments();
      }, 0);

      console.log('>>> barrageMessage success:', isSent);
    } catch (error) {
      console.log('>>> barrageMessage, error:', error);
    }

  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
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

  async requestJoinCall() {

    if (this.role() === 'audience') {

      if (Number(0) <= Number(this.userCreditService.userCredit()!.current)) {
        const roomID = this.roomID;
        const Caller = this.authService.user()!;
        const Callee = this.userService.userProfile()!;

        const result = await this.zgEngine.checkSystemRequirements();
        if (!result.webRTC) {
          this.toastService.start({ type: 'error', message: 'Dispositivo no compatible' });
          return;
        }

        const data = { roomID, Caller, Callee };
        this.userService.addUserVideoCallRequest(data);

        this.dialogService.toggleModal('modalRequestJoinCall');

        this.socketService.socket.emit('call_request_send', this.userService.userVideoCallRequest());

      } else {
        this.dialogService.toggleModal('creditPurchase');
      }
    }
  }

  async onDecisionCall(value: string) {

    if (this.role() === 'transmitter') {
      if (value === 'accept') {
        this.viewRemote.set(true);
      }
      this.userService.updateUserVideoCallRequest({
        decision: value
      })
      this.videoCall.set(true);
      this.socketService.socket.emit('live-call-decision-client', this.userService.userVideoCallRequest());

    }
    this.dialogService.closeModal();
  }

  endVideoCall() {

    if (this.role() === 'transmitter') {
      // Detener la publicación del stream actual
      if (this.localStream) {

        // Actualizar estado para regresar al modo live
        this.viewRemote.set(false);

        // Notificar a los espectadores que la videollamada ha terminado
        this.socketService.socket.emit('live-call-end-client', this.userService.userVideoCallRequest());

        this.zgEngine.stopPublishingStream(this.streamID);
        this.localStream.stop();

        // Reiniciar el modo del transmitter al live
        this.localStream = null;

        this.startTransmitterStream();
      }

    }
  }

  // socket
  socketConnect() {
    this.socketService.socketConnect(this.authService.token());

    if (!this.socketService.socket) {
      return;
    }

    // Listener para recibir solicitud de videollamada
    this.socketService.socket.on(`live-call-request-server/${this.authService.user()?._id}`, (data: UserVideoCallRequest) => {
      if (this.role() === 'transmitter') {
        this.userService.addUserVideoCallRequest(data)
        this.dialogService.toggleModal('modalRequestJoinCall');
      }
    });

    // Listener para aceptar la solicitud
    this.socketService.socket.on(`live-call-decision-server/${this.authService.user()?._id}`, async (data: UserVideoCallRequest) => {
      if (this.role() === 'audience') {

        this.dialogService.closeModal();

        if (data.decision === 'accept') {
          await this.startAudienceStream(); // Publicar el stream como "audience"
          this.viewLocal.set(true);
          this.toastService.start({ type: 'success', message: 'Tu solicitud fue aceptado' });
          this.videoCall.set(true);
        } else {
          this.toastService.start({ type: 'error', message: 'Tu solicitud fue rechazada' });
        }
      }
    });

    // Listener para finalizar la videollamada
    this.socketService.socket.on(`live-call-end-server/${this.roomID}`, () => {
      if (this.role() === 'audience') {
        // Detener el stream actual
        if (this.localStream) {
          this.zgEngine.stopPlayingStream(this.streamID);
          this.localStream = null;
        }

        // Actualizar estado para regresar al modo live
        this.viewLocal.set(false);
        this.toastService.start({ type: 'info', message: 'La videollamada ha terminado' });
      }
    });

    // sound tip
    this.socketService.socket.on(`live-tip-server/${this.roomID}`, async (data: any) => {

      // const transactionCredit: TransactionCredit = data.TransactionCredit;
      // const currentItems = this.transactionCreditService.transactionCreditsReceived();
      // const updatedItems = [transactionCredit, ...currentItems];
      // this.transactionCreditService.addTransactionCreditsReceived(updatedItems);

      // const count = Number(transactionCredit.creditAmount) + Number(this.transactionCreditsReceivedAmount());
      // this.transactionCreditsReceivedAmount.set(count);

      this.playSoundTip();
    });

    this.socketService.socket.on(`live-state-server/${this.userService.userProfile()?._id}`, (user: User) => {
      if (this.role() === 'audience') {
        if (user.live === false) {
          this.role.set('');
          this.router.navigate(['/']);
        }
      }
    });
  }

  // detach socket
  detachSocketEvents() {

    if (!this.socketService.socket) {
      return;
    }

    this.socketService.socket.off(`live-call-request-server/${this.roomID}`);
    this.socketService.socket.off(`live-call-decision-server/${this.roomID}`);
    this.socketService.socket.off(`live-call-end-server/${this.roomID}`);
    this.socketService.socket.off(`live-tip-server/${this.roomID}`);
    this.socketService.socket.off('live-capture-server');
    this.socketService.socket.off(`live-state-server/${this.userService.userProfile()?._id}`);
  }

  scrollToBottomComments(): void {
    if (this.commentContainer) {
      const element = this.commentContainer.nativeElement;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth', // Desplazamiento suave
      });
    }
  }

  //  tip
  onTipDialog() {

    this.viewContainerRef.clear();
    const componentRef = this.viewContainerRef.createComponent(TipComponent);
    componentRef.instance;
    this.dialogService.toggleModal('tip');

    const dataTip = {
      type: 'TIP_LIVE',
      roomID: this.roomID,
      user: this.userService.userProfile()!
    };

    this.tipService.addTip(dataTip);
  }

  // show tip
  onTransactionCreditsReceivedModal() {
    this.dialogService.closeModal();

    // if (this.transactionCreditService.transactionCreditsReceived().length > 0) {
    //   this.dialogService.toggleModal('transactionCreditsReceivedModal');
    // }
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

          const userProfile = this.userService.userProfile();
          userProfile!.liveCapture = resImage;
          this.userService.addUserProfile(userProfile!);
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

  //comment
  createFormCommentControls() {
    this.myFormComment = new FormGroup({
      text: new FormControl(null, [Validators.required]),
    });
  }

  onLogin() {
    const secretKey = 'your-secret-key'; // Cambia esto por una clave segura

    // Datos del usuario
    const userData = {
      route: `${this.userService.userProfile()?.username}/live`,
    };

    // Convertir datos a JSON y luego encriptar con XOR
    const jsonData = JSON.stringify(userData);
    const encryptedData = this.authService.xorEncryptDecrypt(jsonData, secretKey);

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

  logout() {
    this.subscriptionService.resetSubscribersUserJoin();
    this.authService.logout();
  }

  // emoji
  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    const currentText = this.myFormComment.get('text')?.value || '';
    this.myFormComment.get('text')?.setValue(currentText + emoji);
    this.showEmojiPicker = false; // Cierra el selector después de seleccionar
  }

  selectTabEmoji(index: number): void {
    this.emojiSelectedTab = index; // Cambia la pestaña activa
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.showEmojiPicker && this.emojiContainer && !this.emojiContainer.nativeElement.contains(target)) {
      this.showEmojiPicker = false; // Cierra el selector si el clic es fuera del contenedor de emojis
    }

    if (this.showMore() && this.moreContainer && !this.moreContainer.nativeElement.contains(target)) {
      this.showMore.set(false); // Cierra el selector si el clic es fuera del contenedor de emojis
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

  onMoreToogle() {
    this.showMore.set(!this.showMore());
  }

  // username
  onReturnProfile(): void {
    // if (this.userService.userProfile()!.Site?.domain !== 'yalitas.com') {
    //   const urlSite = this.onUrlSite();
    //   const url = `${urlSite}/${this.userService.userProfile()?.username}`;

    //   window.open(`${url}`, "_parent", "noopener,noreferrer");
    // } else {

    // }

    this.router.navigate(['/', this.userService.userProfile()?.username]);
  }

  onReturnCurrentProfile(): void {
    this.spinnerService.start();
    // if (this.authService.user()?.Site?.domain !== 'yalitas.com') {
    //   if (this.role() === 'transmitter') {
    //     this.onLogoutRoom();
    //   } else {
    //     const urlSite = this.onUrlSite();
    //     const url = `${urlSite}/${this.userService.userProfile()?.username}`;
    //     this.authService.logoutSite();

    //     window.open(`${url}`, "_parent", "noopener,noreferrer");
    //   }
    // } else {

    // }
    this.router.navigate(['/', this.authService.user()?.username]);
    this.spinnerService.close();
  }

  // shared username
  onShareProfile() {
    if (navigator.share) {
      const urlSite = this.onUrlSite();
      navigator.share({
        title: this.userService.userProfile()!.username,
        text: this.userService.userProfile()!.bio,
        url: `${urlSite}/` + this.userService.userProfile()!.username + `/live`
      })
        .then(() => console.log('Content shared successfully'))
        .catch((error) => console.log('Error al share:', error));
    } else {
      console.log('The Web Share API is not available in this browser');
    }
  }

  onStartWatchingStream() {
    if (this.role() === 'audience') {
      // Intentar empezar a ver el stream remoto
      this.zgEngine.startPlayingStream(this.streamID)
        .then(() => {
          // Si se logra iniciar la transmisión, actualizar el estado
          this.isWatchingStream = true;
          this.viewRemote.set(true);
          const viewRemote = this.zgEngine.createRemoteStreamView(this.localStream);
          viewRemote.play('remote-video', { enableAutoplayDialog: true });
        })
        .catch(error => {
          this.isWatchingStream = true;
          this.toastService.start({ type: 'error', message: 'No se pudo iniciar la transmisión' });
        });
    }
  }

  playSoundTip() {
    const audio = new Audio('public/sounds/scale.mp3');
    audio.play();
  }
}
