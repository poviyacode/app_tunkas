import { trigger, transition, style, animate, query, stagger, keyframes, state } from '@angular/animations';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ApplicationRef, Component, ComponentRef, effect, HostListener, inject, Inject, OnInit, PLATFORM_ID, signal, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { environment } from '@environments/environment';
import { User } from '@interfaces/user';
import { Post } from '@interfaces/post';
import { UserService } from '@services/user.service';
import { TranslateModule } from '@ngx-translate/core';
import { SearchService } from '@services/search.service';
import { first, Subject, takeUntil, timer } from 'rxjs';
import { Subscription } from '@interfaces/subscription';
import { DialogService } from '@services/dialog.service';
import { TipService } from '@services/tip.service';
import { ToastService } from '@services/toast.service';
import { SpinnerService } from '@services/spinner.service';
import { TipComponent } from '@shared/tip/tip.component';
import { AuthService } from '@services/auth.service';
import { ChatService } from '@services/chat.service';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgeValidator } from '@core/common/custom-validators.ts';
import { CountryService } from '@services/country.service';
import { Country } from '@interfaces/country';
import { Tools } from '@core/common/tools';
import { SocketService } from '@services/socket.service';
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import LoginAuthComponent from '@layout/auth/pages/login-auth/login-auth.component';
import { ModalLoginAuthComponent } from '@layout/auth/pages/modal-login-auth/modal-login-auth.component';
import { MessageService } from '@services/message.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { CalculateAgePipe } from '@pipes/calculate-age';
import { MetaTag } from '@interfaces/metaTags';
import { SeoService } from '@services/seo.service';
import { UserCreditService } from '@services/user-credit.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { SubscriptionService } from '@services/subscription.service';
import { Title } from '@angular/platform-browser';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from '@interfaces/chat';
import { ToolsService } from '@services/tools.service';
import { InteractionService } from '@services/interaction.service';
import ProfileCardComponent from '@shared/profile-card/profile-card.component';

@Component({
  selector: 'app-profiles-home',
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    IconDirective,
    ProfileCardComponent
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
    trigger('headerAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-30px)' }),
        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),

    // Animación en cascada para los elementos hijos
    trigger('staggerAnimation', [
      transition(':enter', [
        query('.stagger-item', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('400ms cubic-bezier(0.4, 0, 0.2, 1)',
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),

    // Animación de pulso para el logo
    trigger('pulseAnimation', [
      transition('* => *', [
        animate('2s ease-in-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.05)', offset: 0.5 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ]),

    // Animación de rotación para el botón live
    trigger('rotateOnHover', [
      state('normal', style({ transform: 'rotate(0deg)' })),
      state('hovered', style({ transform: 'rotate(360deg)' })),
      transition('normal <=> hovered', animate('600ms ease-out'))
    ]),

    // Animación de shimmer para búsqueda
    trigger('shimmerAnimation', [
      state('idle', style({ transform: 'translateX(-100%)' })),
      state('active', style({ transform: 'translateX(100%)' })),
      transition('idle => active', [
        animate('700ms ease-in-out')
      ])
    ]),

    // Animación del indicador live
    trigger('liveIndicator', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0)' }),
        animate('300ms ease-out',
          style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition('* => *', [
        animate('1.5s ease-in-out', keyframes([
          style({ opacity: 1, transform: 'scale(1)', offset: 0 }),
          style({ opacity: 0.6, transform: 'scale(1.3)', offset: 0.5 }),
          style({ opacity: 1, transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ])
  ],
  templateUrl: './profiles-home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './profiles-home.component.scss'
})
export default class ProfilesHomeComponent {

  isBrowser: boolean;
  isServer: boolean;
  urlCurrent = 'users';

  totalPages: number = 0;
  currentPage = 0;
  limitPage = 15;
  hasMore: boolean = true;
  imageLoaded = signal(false);

  shimmerState: string = 'idle';
  rotateState: string = 'normal';
  isLiveActive: boolean = true;

  loading = signal(false);
  posts: Post[] = [];
  countries = signal<Country[] | null>(null);

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private destroy$ = new Subject<void>();

  myForm: FormGroup;
  search: string | null;

  // components
  private tipComponentRef: ComponentRef<TipComponent> | null = null;
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;
  private modalLoginAuthComponentRef: ComponentRef<ModalLoginAuthComponent> | null = null;

  public router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  public userService = inject(UserService);
  private searchService = inject(SearchService);
  public dialogService = inject(DialogService);
  private tipService = inject(TipService);
  private toastService = inject(ToastService);
  private spinnerService = inject(SpinnerService);
  public authService = inject(AuthService);
  private chatService = inject(ChatService);
  public countryService = inject(CountryService);
  private platformId = inject(PLATFORM_ID);
  private socketService = inject(SocketService);
  private applicationRef = inject(ApplicationRef);
  public messageService = inject(MessageService);
  private seoService = inject(SeoService);
  private userCreditService = inject(UserCreditService);
  private transactionCreditService = inject(TransactionCreditService);
  private title = inject(Title);
  private toolsService = inject(ToolsService);
  private interactionService = inject(InteractionService);

  constructor() {

    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    if (this.isBrowser) {

      effect(() => {
        if (!this.authService.user()) {
          this.findSearch();
        }
      });

      this.searchService.sharedData$.subscribe((search) => {
        if (search) {

          this.search = search === 'all' ? null : search;

          this.currentPage = 0;
          this.hasMore = true;
          this.findSearch();
        }

      });
    }
  }

  ngOnInit(): void {
    this.createFormControls();

    if (this.isBrowser) {
      this.findSearch();
    }

    this.headPage();
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const isRefresh = navigationEntries.length > 0 && navigationEntries[0].type === 'reload';

      if (isRefresh) {
        timer(3000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.userOnlineSocket();
          });
      } else {
        this.userOnlineSocket();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      this.destroy$.next();
      this.destroy$.complete();

      this.detachSocketEvents();

      // components
      this.clearCreditPurchaseComponent();
      this.clearTipComponent();
      this.clearModalLoginAuthComponent();

      // resert
      //this.userService.resetUsersProfile();
      this.dialogService.closeModal();
      this.countries.set(null);
    }
  }

  createFormControls() {
    this.myForm = new FormGroup({
      search: new FormControl('', [Validators.required]),
      gender: new FormControl('', [Validators.required]),
      minAge: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(2), AgeValidator]),
      maxAge: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(2), AgeValidator]),
      country: new FormControl('', [Validators.required]),
    });
  }

  // find
  findSearch() {

    if (!this.hasMore) return;
    this.loading.set(true);

    let data: any = {};

    if (this.myForm?.value) {
      const { search, gender, minAge, maxAge, country } = this.myForm.value;

      if (search) {
        data.search = `${search}`;
      }

      if (gender) {
        data.gender = `${gender}`;
      }

      if (minAge) {
        data.minAge = Number(minAge);
      }

      if (maxAge) {
        data.maxAge = Number(maxAge);
      }

      if (country) {
        data.Country = country;
      }

    }
    this.userService.userProfiles(data, this.limitPage, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && res.data.length > 0) {

            if (this.currentPage === 0) {
              this.totalPages = Number(res.total);
              const currentUsersReset = this.userService.usersProfile().map(user => ({
                ...user,
                live: false
              }));
              this.userService.usersProfile.set(currentUsersReset);
            }

            this.userService.addUsersProfile(res.data);

            this.hasMore = res.data.length <= this.limitPage;

          } else {
            this.hasMore = false;
          }

        },
        error: (err) => {
          this.loading.set(false);
        },
        complete: () => {
          this.loading.set(false);
          console.log('Request completed');
        }
      });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
      if (this.hasMore && !this.loading()) {
        this.currentPage = this.currentPage + this.limitPage;
        this.findSearch();
      }
    }
  }

  async findAllCountries() {
    const countries = await this.countryService.findAllDatting();
    this.countries.set(countries);
  }

  // search 
  onSearchToogle(): void {
    this.dialogService.toggleModal('searchProfiles');
    //this.myForm.reset();
    this.shimmerState = 'active';
    setTimeout(() => {
      this.shimmerState = 'idle';
    }, 700);

    if (!this.countries()) {
      this.findAllCountries();
    }
  }


  onHoverRotate(state: string) {
    this.rotateState = state;
  }

  onSearch(): void {

    this.dialogService.closeModal();
    this.loading.set(true);

    this.hasMore = true;
    this.totalPages = 0;
    this.currentPage = 0;
    this.userService.resetUsersProfile();
    this.findSearch();

  }

  // close
  onCloseModal() {
    this.dialogService.closeModal();
  }

  onLive(): void {
    this.router.navigate(['/lives']);
  }

  onUser(user: User): void {
    this.userService.addUserProfile(user);
  }

  // seo
  headPage() {
    const data: MetaTag = {
      title: `Yuvinka Dating :: Make Friends & Meet New People`,
      description: "With 55 billion matches to date, Yuvinka® is the world’s most popular dating app, making it the place to meet new people.",
      path: ``,
      image: `${environment.urlCurrent}/public/logo/dating.jpg`
    };

    const title = `${data.title}`;
    this.title.setTitle(title!);

    this.seoService.updateMetaTags(data);
  }

  // tip
  async onTip(item: User) {
    if (this.authService.user()! && item._id) {
      const dataTip = {
        type: 'TIP_ACCOUNT',
        user: item,
      };
      this.tipService.addTip(dataTip);
      this.onTipModal();
    } else {
      this.onLoginModal();
    }
  }

  // create chat
  async onChat(item: User) {

    if (this.authService.user()) {

      if (this.authService.user()?._id !== item._id) {
        this.spinnerService.start();

        const data = {
          Receiver: item
        }
        this.chatService.create(data)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res) {
                this.messageService.addUserReceiver(item);
                this.chatService.addChat(res);
                this.router.navigate(['/chats/messages', res._id]);
              }
            },
            error: (err) => {
              this.spinnerService.close();
              this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
              console.error('Error al cargar los posts:', err);
            },
            complete: () => {
              this.spinnerService.close();
              console.log('Request completed');
            }
          });
      }

    } else {
      this.onLoginModal();
    }
  }

  // live
  onStartLiveStream() {

    const data: User = {
      liveRoomId: `${Date.now()}`
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

          const url = `${environment.urlPrivate}/auth/auto?data=${encodeURIComponent(encodedData)}`;
          //console.log(url0);
          //const url = `${environment.urlPrivate}/auth/auto`;
          //window.open(`${url}`, "_parent", "noopener,noreferrer");
          this.router.navigateByUrl(userData.route);
        },
        error: (err) => {
          this.spinnerService.close();
          console.error('Errr init live:');
        },
        complete: () => {
          this.spinnerService.close();
          console.log('Request completed');
        }
      });
  }

  onLiveStream(item: User) {

    if (this.authService.user()) {
      const secretKey = 'your-secret-key'; // Cambia esto por una clave segura

      // Datos del usuario
      const userData = {
        username: this.authService.user()?.username,
        password: this.authService.user()?.password,
        route: `${item?.username}/live`,
        Site: environment.site
      };

      // Convertir datos a JSON y luego encriptar con XOR
      const jsonData = JSON.stringify(userData);
      const encryptedData = this.toolsService.xorEncryptDecrypt(jsonData, secretKey);

      // Codificar en Base64 para que sea seguro en la URL
      const encodedData = btoa(encryptedData);

      const url = `${environment.urlPrivate}/auth/auto?data=${encodeURIComponent(encodedData)}`;
      //console.log(url0);
      //const url = `${environment.urlPrivate}/auth/auto`;
      //window.open(`${url}`, "_parent", "noopener,noreferrer");

      this.router.navigateByUrl(userData.route);
    } else {
      this.onLoginModal();
    }
  }

  onMatch(item: User) {
    const data = {
      Receiver: item
    }

    this.chatService.create(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.sendMessage(res, item);
          }
        },
        error: (err) => {
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
          console.error('Error al cargar los posts:', err);
        },
        complete: () => {
          this.toastService.start({ type: 'success', message: '❤️ I like you 😘💕' });
          console.log('Request completed');
        }
      });

  }

  // send message
  sendMessage(chat: Chat, userReceiver: User): void {

    const userCredit = this.userCreditService.userCredit()?.current || 0;
    const gender = this.authService.user()?.gender || 'MAN';

    // if (gender === 'MAN' && Number(userCredit) <= Number(0)) {
    //   this.onCreditPurchase();
    //   return;
    // }

    if (this.authService.user()! && chat) {
      const createPostMedia: any = [];
      const sendData: any = {
        code: uuidv4(),
        filesArray: createPostMedia,
        Chat: chat._id,
        Sender: this.authService.user()!._id,
        Receiver: userReceiver._id,
        message: 'Hello! ❤️ I like you 😘💕',
        status: 'SENT',
        Reply: null,
        credit: 0,
        typeView: 'FREE',
        previewMedia: false,
      }

      this.socketService.socket.emit('message-client', sendData);

      this.chatService.updateChat({
        lastMessageRead: false
      });

      // save locally
      delete sendData.filesArray;

      sendData.PostMedia = createPostMedia;
      sendData.createdAt = new Date();

      const currentMessages = this.messageService.messages();
      const updatedMessages = [...currentMessages, sendData];
      this.messageService.addMessages(updatedMessages);

    }
  }

  // socket 
  userOnlineSocket() {

    if (!this.socketService.socket) {
      this.socketService.connect();
    }

    // 2. Pedimos los usuarios online de la RAM una vez configuradas las escuchas
    //this.socketService.socket.emit('request_initial_online_users');
  }

  detachSocketEvents() {
    if (this.socketService.socket) {

    }
  }

  //modal external
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

  onLoginModal() {
    this.clearModalLoginAuthComponent();
    const componentRef = this.viewContainerRef.createComponent(ModalLoginAuthComponent);
    this.modalLoginAuthComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearModalLoginAuthComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
    });
    this.dialogService.toggleModal('login');
  }

  private clearModalLoginAuthComponent() {
    if (this.modalLoginAuthComponentRef) {
      this.modalLoginAuthComponentRef.destroy();
      this.modalLoginAuthComponentRef = null;
    }
  }

  // function html
  isNewUser(createdAt: string): boolean {
    const createdDate = new Date(createdAt);
    const currentDate = new Date();
    const diffInDays = (currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays < 7;
  }

  getProfileImageUrl(user: User): string {
    return this.toolsService.getProfileImageUrl(user);
  }

  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // button class
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
