import { ApplicationRef, Component, ComponentRef, computed, effect, HostListener, Inject, inject, Input, PLATFORM_ID, signal, ViewChild, ViewContainerRef, WritableSignal, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '@services/auth.service';
import { SocketService } from '@services/socket.service';
import { ToolsService } from '@services/tools.service';
import { UserService } from '@services/user.service';
import { PostService } from '@services/post.service';
import { SubscriptionService } from '@services/subscription.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterLinkWithHref, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { CounterService } from '@services/counter.service';
import { DialogService } from '@services/dialog.service';
import { CreditPurchaseComponent } from '../credit-purchase/credit-purchase.component';
import { MenuSidebar } from '@interfaces/menuSidebar';
import { UserCredit } from '@interfaces/userCredit';
import CreatePostComponent from '@layout/admin/create/create-post/create-post.component';
import { UserCreditService } from '@services/user-credit.service';
import { filter, first, interval, Observable, Subject, Subscription, switchMap, takeUntil, tap, timer } from 'rxjs';
import { environment } from '@environments/environment';
import { SpinnerService } from '@services/spinner.service';
import { User } from '@interfaces/user';
import { Tools } from '@core/common/tools';
import { IconDirective } from '@directive/coin-svg.directive';
import { FollowService } from '@services/follow.service';
import { PushNotificationService } from '@services/push-notitication.service';
import { SwPush } from '@angular/service-worker';
import { BrowserIdService } from '@services/browser-id.service';
import { ToastService } from '@services/toast.service';
import { NotificationService } from '@services/notification.service';
import CreateAdComponent from '@layout/admin/create/create-ad/create-ad.component';
import { SiteService } from '@services/site.service';
import { Site } from '@interfaces/site';
import { MessageService } from '@services/message.service';
import InviteBannerComponent from '@shared/invite-banner/invite-banner.component';
import { InteractionService } from '@services/interaction.service';
import { Message } from '@interfaces/message';
import { ChatService } from '@services/chat.service';
import { Chat } from '@interfaces/chat';
import NotificationsComponent from '@shared/notifications/notifications.component';
import { JoinCallComponent } from '@shared/join-call/join-call.component';
import { LiveStreamService } from '@services/live-stream.service';
import { LiveStream } from '@interfaces/liveStream';

@Component({
  selector: 'sidebar',
  imports: [
    RouterLinkWithHref,
    TranslateModule,
    RouterOutlet,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    IconDirective,
    CommonModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: []
})
export default class SidebarComponent {

  isBrowser: boolean;
  isServer: boolean;

  public getScreenWidth: any;
  public getScreenHeight: any;
  openMobil = signal(false);
  openSidebar: boolean = true;
  menuSidebar: MenuSidebar[] = [];
  menuSidebarModal: MenuSidebar[] = [];
  countryCurrentIso: string | null;
  userCredit: UserCredit | null;
  username: WritableSignal<string | undefined> = signal<string | undefined>(undefined);
  hasLiveContent: boolean;
  langs: any[] = [
    { value: 'en', name: 'English' },
    { value: 'es', name: 'Español' },
    { value: 'pt_BR', name: 'Portugués' },
    { value: 'fr', name: 'Français' },
    { value: 'it', name: 'Italiano' },
    { value: 'de', name: 'Deutsch' },
    { value: 'ja', name: '日本語' },
    { value: 'ko', name: '한국어' },
    { value: 'ru', name: 'Pусский' },
    { value: 'tr', name: 'Türkçe' },
    { value: 'zh', name: '中文' },
  ];
  myformLanguage: FormGroup;
  userCreditData: UserCredit;

  // notification
  deviceInfo = signal<any>(null);
  subscription = signal<PushSubscription | null>(null);
  audio: HTMLAudioElement | null = null;

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef: ViewContainerRef;
  private destroy$ = new Subject<void>();
  // components 
  private inviteBannerComponentRef: ComponentRef<InviteBannerComponent> | null = null;

  //component
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;
  private createPostComponentRef: ComponentRef<CreatePostComponent> | null = null;
  private createAdComponentRef: ComponentRef<CreateAdComponent> | null = null;
  private notificationComponentRef: ComponentRef<NotificationsComponent> | null = null;
  private joinCallComponentRef: ComponentRef<JoinCallComponent> | null = null;

  public counterService = inject(CounterService);
  public authService = inject(AuthService);
  public dialogService = inject(DialogService);
  public toolsService = inject(ToolsService);
  public router = inject(Router);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  public socketService = inject(SocketService);
  private postService = inject(PostService);
  private subscriptionService = inject(SubscriptionService);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  public userCreditService = inject(UserCreditService);
  private spinnerService = inject(SpinnerService);
  private followService = inject(FollowService);
  private pushNotificationService = inject(PushNotificationService);
  private swPush = inject(SwPush);
  private browserIdService = inject(BrowserIdService);
  private toastService = inject(ToastService);
  private notificationService = inject(NotificationService);
  private siteService = inject(SiteService);
  private messageService = inject(MessageService);
  private interactionService = inject(InteractionService);
  private chatService = inject(ChatService);
  private liveStreamService = inject(LiveStreamService);

  currentRoute: string | null = null;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    if (this.isBrowser) {
      this.countryCurrentIso = this.toolsService.countryCurrent ? `/${this.toolsService.countryCurrent}` : '/';

      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          takeUntil(this.destroy$)
        )
        .subscribe((event: NavigationEnd) => {
          const urlSegments = event.urlAfterRedirects.split('/');
          this.currentRoute = urlSegments.includes('messages') || urlSegments.includes('live') ? 'messages' : null;
          if (this.currentRoute) {
            this.toolsService.addHeadMobil(false);
          } else {
            this.toolsService.addHeadMobil(true);
          }
        });
    }
  }

  ngOnInit() {
    if (this.isBrowser) {
      let lang = this.toolsService.language() || window.navigator.language.split('-')[0];
      this.myformLanguage = this.fb.group({ language: [lang, Validators.required] });

      this.getScreenWidth = window.innerWidth;
      this.getScreenHeight = window.innerHeight;
      this.onWindowResize();

      if (this.authService.user()) {
        // 30000 ms = 30 segundos de retraso exactos tras cargar la app
        timer(30000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.getDeviceInfo();
          });
      }
    }
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      timer(3000) // 3 segundos de retraso exactos tras cargar la app
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.userOnlineSocket();
        });

      if (this.authService.user()) {
        this.onUserSuggestions();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      this.destroy$.next();
      this.destroy$.complete();

      this.clearCreateAdComponent();
      this.detachSocketEvents();
    }
  }

  onMenuSiberDialog() {
    this.dialogService.toggleModal('sidebar');
  }

  onCloseModal() {
    this.dialogService.closeModal();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.getScreenWidth = window.innerWidth;
    this.getScreenHeight = window.innerHeight;
    this.openMobil.set(this.getScreenWidth <= 640);
    this.openSidebar = this.getScreenWidth >= 1100;
  }

  logout() {
    this.dialogService.closeModal();
    this.dialogService.closeModal();
    this.subscriptionService.resetSubscribersUserJoin();

    this.authService.logout();

  }

  logoutToPrivate() {

    const token = JSON.parse(localStorage.getItem('access_token')!);
    const username = this.authService.user()?.username!;

    this.logout();

    const SiteMain = {
      code: 'exitada'
    };

    this.redirectToSite(token, username, SiteMain);

  }

  async redirectToSite(token: string, username: string, SiteMain: Site) {

    const data = {
      siteAfter: SiteMain.code,
      siteCurrent: "yuvinka",
      production: environment.production,
    }

    this.spinnerService.start();

    const { SiteAfter, SiteCurrent } = await this.siteService.findSiteRedirect(data);

    const secretKey = 'your-secret-key'; // Cambia esto por una clave segura

    if (!token || !username) {
      return;
    }

    // Datos 
    const userData = {
      token: token,
      route: `${username}`,
      SiteMain: SiteCurrent
    };

    const jsonData = JSON.stringify(userData);
    const encryptedData = this.toolsService.xorEncryptDecrypt(jsonData, secretKey);

    const encodedData = btoa(encryptedData);
    const redirectUrl = `${SiteAfter.domain}/token-login?data=${encodeURIComponent(encodedData)}`;
    this.spinnerService.close();
    window.open(redirectUrl, "_parent", "noopener,noreferrer");
  }

  // live
  async onStartLiveStream() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.router.navigateByUrl(`/${user.username}`);
      return;
    }

    const data = {
      transmissionType: 'STREAMING',
      live: true
    };

    this.spinnerService.start();
    this.liveStreamService.handleLiveStreamStatus(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.router.navigateByUrl(`/live/${user.username}`);
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

  async onStartLiveStream0() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      const route = `/${user.username}`;
      this.router.navigateByUrl(`${route}`).then(() => {
        //window.location.reload();
      });
    }

    const data: User = {
      transmissionType: 'STREAMING',
      live: true
    };

    this.spinnerService.start();
    this.userService.update(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const secretKey = 'your-secret-key'; // Cambia esto por una clave segura

          // Datos del usuario
          const userData = {
            username: this.authService.user()?.username,
            password: this.authService.user()?.password,
            route: `${this.authService.user()?.username}/live`,
            Site: environment.site
          };

          // Convertir datos a JSON y luego encriptar con XOR
          const jsonData = JSON.stringify(userData);
          const encryptedData = this.toolsService.xorEncryptDecrypt(jsonData, secretKey);

          // Codificar en Base64 para que sea seguro en la URL
          const encodedData = btoa(encryptedData);

          //const url = `${environment.urlPrivate}/auth/auto`;
          //window.open(`${url}`, "_parent", "noopener,noreferrer");
          this.router.navigateByUrl(userData.route);

          this.getFollowersSreaming();

        },
        error: (err) => {
          this.spinnerService.close();
        },
        complete: () => {
          this.spinnerService.close();
        }
      });
  }

  async followersSendEmail() {

    if (!this.authService.user()) {
      return;
    }

    const data = {
      templateName: "live-alert"
    };

    this.spinnerService.start();

    const userId = this.authService.user()?._id!;

    this.followService.getFollowersSendEmail(data, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {

        },
        error: (err) => {

        },
        complete: () => {

        }
      });
  }

  // send push online
  async getFollowersOnline() {
    await this.pushNotificationService.getFollowersOnline();
  }

  // send push streaming
  async getFollowersSreaming() {
    await this.pushNotificationService.getFollowersSreaming();
  }

  // create post
  onCreatePost() {
    this.onCreatePostModal();
  }

  onCreateAd() {
    this.onCreateAdModal();
  }

  onUser(): void {
    this.dialogService.closeModal();
    this.onScrollTop();
    this.userService.addUserProfile(this.authService.user()!);
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  // socket 
  get socketStatus() {
    return this.socketService.socketStatus();
  }

  socketConnect() {
    this.socketService.socketStatus() ? this.socketService.disconnect() : this.socketService.connect();
  }

  connect() {
    this.socketService.connect();
  }

  disconnect() {
    this.socketService.disconnect();
  }

  // lang
  changeLang(lang: string) {
    this.translate.use(lang).subscribe({
      next: () => {
        this.toolsService.languageCreate(lang);
      },
      error: (err) => {

      }
    });
  }

  // scroll
  onScrollTop() {
    this.document.documentElement.scrollTop = 0;
  }


  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // notification
  async getDeviceInfo() {
    const deviceInfo = await this.browserIdService.getFullDeviceInfo()!;
    this.deviceInfo.set(deviceInfo);
    const browserId = this.deviceInfo().browserId;
    if (browserId && this.authService.user() && this.currentRoute !== 'admin' && environment.production) {
      await this.requestPermission();
    }
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {

        this.swPush.requestSubscription({
          serverPublicKey: environment.publicKey,
        }).then(subscription => {

          this.subscription.set(subscription);

          if (!this.subscription) {
            return;
          }

          this.createNotification();

        }).catch(err => {

        });

      }

    } catch (error) {

    }
  }

  createNotification(): void {

    if (!this.subscription() || !this.deviceInfo()) {
      this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
      return;
    }

    const subscription = this.subscription();
    const deviceInfo = this.deviceInfo();
    const data = {
      token: subscription,
      ...deviceInfo
    };

    this.pushNotificationService.create(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.pushNotificationService.resetPushNotification();
          if (res && res.User === this.authService.user()?._id) {
            //this.eventNotification();
            this.pushNotificationService.addPushNotification(res);
          }
        },
        error: (err) => {
          this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
        },
        complete: () => {
          this.toastService.start({ type: 'success', message: 'notificationEnabled' });
        }
      });
  }

  eventNotification() {
    const eventPush = this.pushNotificationService.eventPushNotification()!;
    if (!eventPush) {
      return;

    }
    const { event, message } = eventPush;

    if (event === 'SEND') {

      if (message.data.sound) {
        // Reproducir el sonido
        this.playSoundNotification();
      }

      const notification = message.notification;
      this.notificationService.addNotification({
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        timestamp: notification.timestamp,
        actions: notification.actions,
      });
    }
  }

  playSoundNotification() {
    if (!this.audio) {
      this.audio = new Audio('public/sounds/universfield-notification.mp3');
    }
    this.audio.play().catch((error) => {

    });
  }

  // suggestion
  async onUserSuggestions() {
    this.interactionService.resetUserSuggestions();
    const resUserSuggestions = await this.interactionService.getSuggestions();
    this.interactionService.addUserSuggestions(resUserSuggestions);
    this.onInviteBanner();
  }

  userOnlineSocket() {

    if (!this.socketService.socket) {
      this.socketService.connect();
    }

    this.socketService
      .onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const message: Message = data?.message;
        const chat = data?.chat;

        if (!message) return;

        // update chat
        const chatExist: Chat = this.chatService.chats().find(c => c!._id === chat._id)!;
        const updatedChat = { ...chat };

        if (chatExist) {

          // CORRECCIÓN CRUCIAL: Mantener los estados dinámicos 'online' y 'live' del frontend
          if (updatedChat.User && chatExist.User) {
            updatedChat.User.online = chatExist.User.online;
            updatedChat.User.live = chatExist.User.live;
            updatedChat.User.onlineAt = chatExist.User.onlineAt;
          }

          updatedChat.User.countCredit = updatedChat.User.countCredit || { current: 0 };
          updatedChat.User.countCredit.current = chatExist.User?.countCredit?.current || 0;

          this.chatService.updateChats(chat._id!, chat);
          this.sortChats();

        } else {
          const currentChats = this.chatService.chats();
          const updatedChats = [updatedChat, ...currentChats];
          this.chatService.addChats(updatedChats);
        }

        //push notification
        const image = message.Sender?.Profile?.[0]?.cloudflare?.result?.variants?.[0] || '';
        const title = message.Sender?.username || 'Unknown user';
        const body = message.message || '';
        const timestamp = Number(message.createdAt) || Number(new Date());

        this.notificationService.addNotification({
          icon: image,
          title,
          body,
          timestamp
        });

        this.playSoundNotification();

        this.onNotification();
      });

    this.socketService
      .onMessageSent()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const message: Message = data?.message;
        const chat = data?.chat;

        if (!message || !chat) return;

        // update message
        const dataMessage = {
          ...message,
          Receiver: message.Receiver._id,
          Sender: message.Sender._id
        };
        this.messageService.updateMessages(message.code!, dataMessage);

        // update chat
        const chatExist: Chat = this.chatService.chats().find(c => c!._id === chat._id)!;

        const updatedLastMessage = {
          ...message,
          Sender: this.authService.user()!._id
        };

        if (chatExist) {
          const dataUpdateChat: Chat = {
            ...chatExist,
            lastMessageAt: `${message.createdAt || new Date()}`,
            LastMessage: updatedLastMessage
          };

          this.chatService.updateChats(chat._id!, dataUpdateChat);
          this.sortChats();

        } else {
          const updatedChat = {
            ...chat,
            LastMessage: updatedLastMessage
          };
          const currentChats = this.chatService.chats();
          const updatedChats = [updatedChat, ...currentChats];
          this.chatService.addChats(updatedChats);
        }
      });

    this.socketService
      .onMessageDeleted()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const { message, chat, unreadCount } = data;
        if (!data) return;

        const chatExist: Chat = this.chatService.chats().find(chat => chat!._id === chat._id)!;

        if (chatExist) {
          this.chatService.updateChats(chat._id!, chat);
          this.sortChats();

        } else {
          if (this.authService.user()! && chat.Sender && chat.Sender!._id == this.authService.user()!._id) {
            chat.User = chat.Receiver;
          } else if (this.authService.user()! && chat.Receiver && chat.Receiver!._id == this.authService.user()!._id) {
            chat.User = chat.Sender;
          }

          const currentChats = this.chatService.chats();
          const updatedChats = [chat, ...currentChats];
          this.chatService.addChats(updatedChats);
        }
      });

    this.socketService
      .onInitialOnlineUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((onlineUsers: any[]) => {
        //+++ chat
        if (!onlineUsers || !Array.isArray(onlineUsers)) return;

        // Mapeamos los chats cargados por HTTP
        this.chatService.chats().forEach(chat => {
          if (chat.User) {
            // Buscamos si el ID del chat existe dentro de los objetos del array del socket
            const isOnline = onlineUsers.some(u => {
              // Asegúrate de usar la propiedad correcta del backend (ej: u._id o u.id)
              const socketUserId = u._id;
              return socketUserId === chat.User!._id;
            });

            if (isOnline) {
              chat.User.online = true;
              this.chatService.updateChats(chat._id!, chat);
            }
          }
        });

        //+++ message
        const receiverId = this.messageService.userReceiver()?._id;

        if (receiverId && Array.isArray(onlineUsers)) {
          const amIOnline = onlineUsers.some((user: any) => user._id === receiverId);

          if (amIOnline) {
            this.messageService.updateUserReceiver({ online: true });
          }
        }

        // users profile
        // 1. Obtener la lista actual de perfiles (creamos una copia para no mutar el estado directamente)
        let currentItems = [...(this.userService.usersProfile() || [])];

        // 2. CASO VACÍO: Si llega vacío, ponemos a todos en offline
        if (!onlineUsers || onlineUsers.length === 0) {
          const updatedItems = currentItems.map(user => ({
            ...user,
            online: false
          }));
          this.userService.addUsersProfile(updatedItems);
          return;
        }

        // 3. CASO CON ELEMENTOS: Procesar los usuarios que vienen del Socket
        // Creamos un mapa de los usuarios actuales indexados por su _id para búsquedas rápidas O(1)
        const currentUsersMap = new Map(currentItems.map(user => [user._id, user]));

        onlineUsers.forEach(incomingUser => {
          if (currentUsersMap.has(incomingUser._id)) {
            // --- SI ENCUENTRA: Actualiza el estado online ---
            const existingUser = currentUsersMap.get(incomingUser._id)!;

            // Actualizamos sus propiedades manteniendo las locales y forzando online: true
            const updatedUser = {
              ...existingUser,
              ...incomingUser, // Por si el backend trae datos más frescos (como liveRoomId)
              online: true
            };

            // Reemplazamos en nuestro array local de control
            currentUsersMap.set(incomingUser._id, updatedUser);

            // Si tu servicio requiere notificar actualizaciones individuales por ID, lo ejecutas aquí:
            this.userService.updateUsersProfile(incomingUser._id, updatedUser);

          } else {
            // --- SI NO ENCUENTRA: Es un usuario nuevo en la RAM, lo agregamos ---
            const newUser = { ...incomingUser, online: true };

            // Lo añadimos al mapa para que sea parte de la lista unificada
            currentUsersMap.set(newUser._id, newUser);

            // Opcional: Si necesitas persistir el nuevo usuario individualmente en tu servicio
            this.userService.updateUsersProfile(newUser._id, newUser);
          }
        });

        // 4. Re-armar la lista final con todos los cambios aplicados
        let finalItems = Array.from(currentUsersMap.values());

        // 5. Ordenar la lista: los usuarios 'online' se van arriba automáticamente
        finalItems.sort((a, b) => {
          const aOnline = a.online === true ? 1 : 0;
          const bOnline = b.online === true ? 1 : 0;
          return bOnline - aOnline; // Descendente: 1 (online) va antes que 0 (offline)
        });

        // 6. Guardar la lista definitiva ordenada en el estado global de tu servicio
        this.userService.addUsersProfile(finalItems);

        // user profile
        const userProfileId = this.userService.userProfile()?._id;
        if (userProfileId && Array.isArray(onlineUsers)) {
          const amIOnline = onlineUsers.some(user => user._id === userProfileId);

          if (amIOnline) {
            this.userService.updateUserProfile({ online: true });
          }
        }

      });

    this.socketService
      .onUserOnlineStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: User) => {

        if (!user) return;

        // Buscamos el chat que pertenece a este usuario que cambió su estado
        const chat = this.chatService.chats().find(item =>
          item.Sender?._id === user._id || item.Receiver?._id === user._id || item.User?._id === user._id
        );

        if (chat) {
          // Actualizamos el estado tanto en el objeto User genérico como en las subpropiedades
          if (chat.User && chat.User._id === user._id) chat.User.online = user.online;
          if (chat.User && chat.User._id === user._id) chat.User.live = user.live;
          if (chat.Sender && chat.Sender._id === user._id) chat.Sender.online = user.online;
          if (chat.Receiver && chat.Receiver._id === user._id) chat.Receiver.online = user.online;

          this.chatService.updateChats(chat._id!, chat);
        }

        if (user.online) {
          const image = user.Profile?.[0]?.cloudflare?.result?.variants?.[0] || '';
          const title = user.username || 'Unknown user';
          const body = 'ONLINE';
          const timestamp = Number(user.onlineAt) || Number(new Date());

          this.notificationService.addNotification({
            icon: image,
            title,
            body,
            timestamp
          });

          this.playSoundNotification();
        }

        // users profile 
        const currentItems = this.userService.usersProfile();
        const poToUpdate = currentItems.find((item) => item._id === user._id);

        if (poToUpdate) {
          this.userService.updateUsersProfile(user._id!, { ...user });
        } else {
          const updatedItems = [user, ...currentItems.filter(item => item._id !== user._id)];
          this.userService.addUsersProfile(updatedItems);
        }

        const data: any = {};

        if (user.live !== undefined) data.live = user.live;
        if (user.online !== undefined) data.online = user.online;
        if (user.onlineAt !== undefined) data.onlineAt = user.onlineAt;
        if (user.Profile !== undefined) data.Profile = user.Profile;
        if (user.Cover !== undefined) data.Cover = user.Cover;

        // message 
        const messageReceiverId = this.messageService.userReceiver()?._id;

        if (messageReceiverId === user._id) {
          if (Object.keys(data).length > 0) {
            this.messageService.updateUserReceiver(data);
          }
        }

        // user profile
        const userProfileId = this.userService.userProfile()?._id;
        if (userProfileId === user._id) {
          if (Object.keys(data).length > 0) {
            this.userService.updateUserProfile(data);
          }
        }
      });

    this.socketService
      .onLiveStreamStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((liveStream: LiveStream) => {
        if (!liveStream) return;

        // const user = liveStream.User!;
        // console.log('✅ Live Stream Status:', user);
        // const currentItems = this.userService.usersProfile();
        // const poToUpdate = currentItems.find((item) => item._id === user._id);

        // if (poToUpdate) {
        //   console.log('poToUpdate', user.live);
        //   poToUpdate.live = user.live;
        //   this.userService.updateUsersProfile(user._id!, { live: user.live });
        // }

      });

    this.socketService
      .onIncomingCall()
      .pipe(takeUntil(this.destroy$))
      .subscribe((liveStream: LiveStream) => {
        this.liveStreamService.addLiveStream(liveStream);
        this.onJoinCall();
      });
  }

  detachSocketEvents() {
    if (this.socketService.socket) {
    }
  }

  sortChats() {
    this.chatService.chats().sort((a, b) => {
      const fechaA = new Date(a.lastMessageAt!);
      const fechaB = new Date(b.lastMessageAt!);
      return fechaB.getTime() - fechaA.getTime();
    });

    const currentChats = this.chatService.chats();
    const updatedChats = [...currentChats];
    this.chatService.addChats(updatedChats);
  }

  // user image
  getProfileImageUrl(user: User): string {

    const userProfile = user!;
    if (!userProfile || !userProfile.Profile || userProfile.Profile.length === 0) {
      return '';
    }

    const profile = userProfile.Profile[0];
    if (profile.cloudflare && profile.cloudflare.result && profile.cloudflare.result.variants && profile.cloudflare.result.variants.length > 0) {
      return profile.cloudflare.result.variants[0];
    }
    return profile.url || '';
  }

  // modal external
  onCreateAdModal() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    this.postService.resetPost();
    this.clearCreatePostComponent();

    const componentRef = this.viewContainerRef.createComponent(CreateAdComponent);

    this.createAdComponentRef = componentRef;

    componentRef.instance.closeModal.subscribe(() => {
      this.clearCreatePostComponent();
      this.dialogService.closeModal();
    });

    this.dialogService.toggleModal('createPostAd');
  }

  private clearCreateAdComponent() {
    if (this.createAdComponentRef) {
      this.createAdComponentRef.destroy();
      this.createAdComponentRef = null;
    }
  }

  onCreatePostModal() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      const route = `/${user.username}`;
      this.router.navigateByUrl(`${route}`).then(() => {
        //window.location.reload();
      });

    }

    this.postService.resetPost();
    this.clearCreatePostComponent();

    const componentRef = this.viewContainerRef.createComponent(CreatePostComponent);
    this.createPostComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearCreatePostComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
    });
    this.dialogService.toggleModal('createPost');
  }

  private clearCreatePostComponent() {
    if (this.createPostComponentRef) {
      this.createPostComponentRef.destroy();
      this.createPostComponentRef = null;
    }
  }

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

  onInviteBanner() {
    this.clearInviteBannerComponent();
    const componentRef = this.viewContainerRef.createComponent(InviteBannerComponent);
    this.inviteBannerComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearInviteBannerComponent();
      this.dialogService.closeModal();
    });
    this.dialogService.toggleModal('inviteBanner');
  }

  private clearInviteBannerComponent() {
    if (this.inviteBannerComponentRef) {
      this.inviteBannerComponentRef.destroy();
      this.inviteBannerComponentRef = null;
    }
  }

  onNotification() {
    this.clearNotificationComponent();
    const componentRef = this.viewContainerRef.createComponent(NotificationsComponent);
    this.notificationComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      console.log('closeNotification');
      this.clearNotificationComponent();
      this.dialogService.closeModal();
    });
    this.dialogService.toggleModal('notification');
  }

  private clearNotificationComponent() {
    if (this.notificationComponentRef) {
      this.notificationComponentRef.destroy();
      this.notificationComponentRef = null;
    }
  }

  onJoinCall() {
    this.clearJoinCallComponent();
    const componentRef = this.viewContainerRef.createComponent(JoinCallComponent);
    this.joinCallComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      console.log('closeJoinCall');
      this.clearJoinCallComponent();
      this.dialogService.closeModal();
    });
    this.dialogService.toggleModal('modalRequestJoinCall');
  }

  private clearJoinCallComponent() {
    if (this.joinCallComponentRef) {
      this.joinCallComponentRef.destroy();
      this.joinCallComponentRef = null;
    }
  }

  // class
  buttonClass() {
    return Tools.buttonClass();
  }

  buttonSecondaryClass() {
    return Tools.buttonSecondaryClass();
  }


}
