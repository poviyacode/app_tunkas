import { CommonModule, isPlatformBrowser, isPlatformServer, Location } from '@angular/common';
import { ApplicationRef, Component, ComponentRef, computed, effect, ElementRef, HostListener, inject, PLATFORM_ID, signal, ViewChild, ViewContainerRef, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, Meta, SafeHtml, SafeResourceUrl, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { Tools } from '@core/common/tools';
import { environment } from '@environments/environment';
import { Membership } from '@interfaces/membership';
import { User, UserRole, UserVideoCallRequest } from '@interfaces/user';
import { SpinnerService } from '@services/spinner.service';
import { ToastService } from '@services/toast.service';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { ChatService } from '@services/chat.service';
import { DialogService } from '@services/dialog.service';
import { PostService } from '@services/post.service';
import { SocketService } from '@services/socket.service';
import { SubscriptionService } from '@services/subscription.service';
import { TipService } from '@services/tip.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { UserService } from '@services/user.service';
import { TipComponent } from '@shared/tip/tip.component';
import { debounceTime, first, lastValueFrom, single, Subject, switchMap, takeUntil } from 'rxjs';
import { SeoService } from '@services/seo.service';
import { MetaTag } from '@interfaces/metaTags';
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import { UserCreditService } from '@services/user-credit.service';
import { v4 as uuidv4 } from 'uuid';
import { MessageService } from '@services/message.service';
import { Subscription } from '@interfaces/subscription';
import { IconDirective } from '@directive/coin-svg.directive';
import { DateAgoPipe } from '@pipes/date-ago.pipe';
import { CalculateAgePipe } from '@pipes/calculate-age';
import { ToolsService } from '@services/tools.service';
import { NumberFormatPipe } from '@pipes/number-format.pipe';
import { FollowService } from '@services/follow.service';
import { ModalLoginAuthComponent } from '@layout/auth/pages/modal-login-auth/modal-login-auth.component';
import { PushNotificationService } from '@services/push-notitication.service';
import KissmeComponent from '@shared/kissme/kissme.component';
import { KissService } from '@services/kiss.service';
import { SiteService } from '@services/site.service';
import { Site } from '@interfaces/site';
import { PostMediaDetails } from '@interfaces/postMedia';
import { PostMediaService } from '@services/post-media.service';
import { SocialMediaService } from '@services/social-media.service';
import { TruncatePipe } from '@pipes/truncate.pipe';
import { JoinCallComponent } from '@shared/join-call/join-call.component';
import { LiveStreamService } from '@services/live-stream.service';
import { LiveStream } from '@interfaces/liveStream';

@Component({
  selector: 'app-main-profile',
  imports: [
    CommonModule,
    RouterModule,
    IconDirective,
    DateAgoPipe,
    CalculateAgePipe,
    TranslateModule,
    NumberFormatPipe,
    TruncatePipe
  ],
  templateUrl: './main-profile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './main-profile.component.scss'
})
export default class MainProfileComponent {

  // ssr
  isBrowser: boolean;
  isServer: boolean;
  isScrollAtTop: boolean = true;

  // profile
  slug: string;
  loading = signal(false);
  count: any;

  // membership
  daysDiffMembership = signal(false);
  bundlesMembership = signal(false);

  //  follow
  checkIfUserFollows = signal(false);
  countFollowers = signal(0);

  // 
  socialMediaList = computed(() => this.userService.userProfile()?.SocialMedia || []);

  // container
  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private destroy$ = new Subject<void>();

  // components
  private tipComponentRef: ComponentRef<TipComponent> | null = null;
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;
  private modalLoginAuthComponentRef: ComponentRef<ModalLoginAuthComponent> | null = null;
  private joinCallComponentRef: ComponentRef<JoinCallComponent> | null = null;

  //read more
  showFullText = signal(false);

  private activatedRoute = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  public userService = inject(UserService);
  public authService = inject(AuthService);
  public transactionCreditService = inject(TransactionCreditService);
  public subscriptionService = inject(SubscriptionService);
  private postService = inject(PostService);
  private seoService = inject(SeoService);
  private location = inject(Location);
  public document = inject(DOCUMENT);
  private chatService = inject(ChatService);
  public router = inject(Router);
  private dialogService = inject(DialogService);
  private tipService = inject(TipService);
  private socketService = inject(SocketService);
  private applicationRef = inject(ApplicationRef);
  public userCreditService = inject(UserCreditService);
  private spinnerService = inject(SpinnerService);
  private toastService = inject(ToastService);
  private messageService = inject(MessageService);
  private title = inject(Title);
  private toolsService = inject(ToolsService);
  private kissService = inject(KissService);
  private followService = inject(FollowService);
  public sanitizer = inject(DomSanitizer);
  private pushNotificationService = inject(PushNotificationService);
  private siteService = inject(SiteService);
  private postMediaService = inject(PostMediaService);
  private socialMediaService = inject(SocialMediaService);
  private liveStreamService = inject(LiveStreamService);

  constructor() {

    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    this.activatedRoute.paramMap.subscribe((params) => {
      this.slug = params.get('slug')!;


      if (this.userService.userProfile()?.username !== this.slug) {
        this.userService.resetUserProfile();
      }
      this.findOne();

    });
  }

  ngOnInit(): void {
    this.onScrollTop();
  }

  ngAfterViewInit(): void {

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // component
    this.clearCreditPurchaseComponent();
    this.clearTipComponent();
  }

  // find one
  findOne() {
    this.loading.set(true);
    this.daysDiffMembership.set(false);
    this.bundlesMembership.set(false);

    const data = {
      username: this.slug,
      User: this.authService.user()! ? this.authService.user()!._id : null,
    }

    this.userService.slug(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res) => {
          if (res) {
            const userProfile: User = {
              ...res.User,
              Subscription: res.Subscription
            };

            this.checkIfUserFollows.set(res.checkIfUserFollows);

            this.userService.addUserProfile(userProfile);
            this.transactionCreditService.addCreditCalculator(res.CreditCalculator!);

            if (Number(res.Subscription?.daysDiffMembership) > 0) {
              this.bundlesMembership.set(false);

              this.daysDiffMembership.set(true);

            } else {
              this.bundlesMembership.set(true);
              this.daysDiffMembership.set(false);
            }

            if (this.authService.user() && this.authService.user()?._id === this.userService.userProfile()?._id) {
              this.daysDiffMembership.set(false);
              this.bundlesMembership.set(true);
            }

            this.subscriptionService.addSubscriptionJoin(res.Subscription);
            // const currentItems = this.subscriptionService.subscribersUserJoin();
            // const newSuscription = [res.Subscription];
            // const newItem = newSuscription.filter((newITem: Subscription) => {
            //   return !currentItems.some(existingItem => existingItem._id === newITem._id);
            // });
            // const updatedPostsUser = [...currentItems, ...newItem];
            // this.subscriptionService.addSubscribersUserJoin(updatedPostsUser);

            this.count = res!.count;
            this.countFollowers.set(res.count.countFollowers);

            this.postService.addCountCountPostsProfile(res!.count);
            this.headPage(this.userService.userProfile()!);

            await this.gainFollowers();
          }

          if (this.isBrowser) {
            this.userOnlineSocket();
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

  async gainFollowers() {

    if (!this.authService.user()) return;

    this.loading.set(true);

    const user = this.userService.userProfile()!;
    // Evaluamos si el array de roles contiene 'CREATOR'
    const isCreator = this.getRoles('CREATOR');
    if (!isCreator && !user) return;

    const gender = user.gender === 'WOMAN' ? 'WOMAN' : 'MALE';

    const data = {
      gender: gender,
    }
    this.followService.gainFollowers(data, user._id!)
      .subscribe({
        next: (res) => {

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

  // seo 
  headPage(user: User) {
    const data: MetaTag = {
      title: `Video Call - ${user.username!}`,
      description: user.bio!,
      path: `${user.username}`,
      url: `${environment.urlCurrent}/${user.username}`,
      image: user.Profile && user.Profile!.length > 0 && user.Profile![0].cloudflare && user.Profile![0].cloudflare.result.variants[0] ? user.Profile![0].cloudflare.result.variants[0] : user.Profile && user.Profile!.length > 0 ? user.Profile![0].url! : `${environment.urlCurrent}/public/logo/dating.jpg`
    }

    const title = `${user.username!}`;
    this.title.setTitle(title!);

    this.seoService.updateMetaTags(data);
  }

  // profile
  onProfile(): void {
    if (this.userService.userProfile()?.live &&
      this.userService.userProfile()?.transmissionType === 'STREAMING' &&
      this.authService.user()?._id !== this.userService.userProfile()?._id) {
      this.router.navigateByUrl(`/live/${this.userService.userProfile()?.username}`,);
    }
  }

  // follow
  async onFollowUser() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    if (this.authService.user()?._id) {
      if (this.authService.user()?._id !== this.userService.userProfile()?._id) {

        const data = {
          Follower: this.authService.user()?._id,
          Following: this.userService.userProfile()?._id
        }

        this.followService.followUser(data)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              this.checkIfUserFollows.set(res);
              const count = Number(this.countFollowers() + 1);
              this.countFollowers.set(count);
            },
            error: (err) => {
              console.error('Error follow user:', err);
            },
            complete: () => {
              console.log('Request completed follow user');
            }
          });

      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  async onUnfollowUser() {

    if (this.authService.user()?._id) {
      if (this.authService.user()?._id !== this.userService.userProfile()?._id) {

        const data = {
          Follower: this.authService.user()?._id,
          Following: this.userService.userProfile()?._id
        }

        this.followService.unfollowUser(data)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              this.checkIfUserFollows.set(res);
              const count = Number(this.countFollowers() - 1);
              this.countFollowers.set(count);
            },
            error: (err) => {
              console.error('Error al cargar los posts:', err);
            },
            complete: () => {
              console.log('Request completed');
            }
          });

      }
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
  // create chat
  async onChat() {
    const data: { Sender: User, Receiver: User } = {
      Sender: this.authService.user()!,
      Receiver: this.userService.userProfile()!
    }

    await this.chatService.startChatWithProfile(data);
  }
  // tip
  onTip() {
    const dataTip = {
      type: 'TIP_ACCOUNT',
      user: this.userService.userProfile()!
    };
    this.tipService.addTip(dataTip);

    this.onTipModal();
  }
  // shared username
  share() {
    if (navigator.share) {
      navigator.share({
        title: this.userService.userProfile()!.username,
        text: this.userService.userProfile()!.bio,
        url: `https://${environment.domain}/` + this.userService.userProfile()!.username
      })
        .then(() => console.log('Content shared successfully'))
        .catch((error) => console.log('Error al share:', error));
    } else {
      console.log('The Web Share API is not available in this browser');
    }
  }

  onMenuSiberDialog() {
    this.dialogService.toggleModal('sidebar');
  }

  // membership susbcription 
  async onSubmitBundles(membership: Membership) {

    if (!this.authService.user()) {
      this.onLoginModal();
      return;
    }

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    if (this.authService.user()?._id === this.userService.userProfile()?._id) {
      return;
    }

    const userCredit = this.userCreditService.userCredit()?.current || 0;
    const gender = this.authService.user()?.gender || 'MAN';

    if (Number(userCredit) < Number(membership.credit)) {
      this.onCreditPurchase();
      return;
    }

    this.spinnerService.start();

    const data = {
      creditAmount: Number(membership.credit),
      Membership: membership,
      type: 'MEMBERSHIP',
      Receiver: this.userService.userProfile()
    }

    this.transactionCreditService.createTransfer(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.subscriptionService.addSubscriptionJoin(res.Subscription);
            this.toastService.start({ type: 'success', message: 'successfulSubscription' });

            if (Number(res.Subscription?.daysDiffMembership) > 0) {
              this.bundlesMembership.set(false);

              this.daysDiffMembership.set(true);
            } else {
              this.bundlesMembership.set(true);
              this.daysDiffMembership.set(false);
            }

            if (this.authService.user() && this.authService.user()?._id === this.userService.userProfile()?._id) {
              this.daysDiffMembership.set(false);
              this.bundlesMembership.set(false);
            }

            this.kissService.start(2500);

            if (!this.checkIfUserFollows()) {
              this.onFollowUser();
            }

          }
        },
        error: (err) => {
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
          this.spinnerService.close();
        },
        complete: () => {
          this.spinnerService.close();
          this.toastService.start({ type: 'success', message: 'successfulSubscription' });
        }
      });
  }

  // video call
  async requestJoinCall() {

    if (!this.userService.hasEnoughCredits()) {
      this.onCreditPurchase();
      return;
    }

    this.spinnerService.start();
    const dataLive: any = {
      transmissionType: "VIDEOCALL",
      live: true,
      invitedUserIds: [this.userService.userProfile()!._id]
    }
    this.liveStreamService.handleLiveStreamStatus(dataLive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (liveStream) => {
          if (liveStream) {
            this.onJoinCall();
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
        },
        complete: () => {
          this.spinnerService.close();
          this.toastService.start({ type: 'success', message: 'videoCallRequestSent' });
        }
      });

  }

  // sendMessage
  async onMessage(data: any) {

    const { Sender, Receiver, type, credit, message } = data;

    if (!this.authService.user()) {
      return;
    }

    const dataChat = {
      Receiver: Receiver
    }

    const res = await this.chatService.chatByReceiver(dataChat);

    this.chatService.addChat(res);

    if (this.chatService.chat()) {
      const createPostMedia: any = [];
      const sendData: any = {
        code: uuidv4(),
        filesArray: createPostMedia,
        Chat: this.chatService.chat()!._id,
        Sender: Sender._id,
        Receiver: Receiver._id,
        message: message,
        status: 'SENT',
        Reply: null,
        credit: credit,
        typeView: 'FREE',
        previewMedia: false,
        type: type
      }

      this.socketService.socket.emit('message-client', sendData);

      // save locally
      delete sendData.filesArray;

      sendData.PostMedia = createPostMedia;
      sendData.createdAt = new Date();
      sendData.status = 'SENT';

      const currentMessages = this.messageService.messages();
      const updatedMessages = [...currentMessages, sendData];
      this.messageService.addMessages(updatedMessages);
    }
  }

  // send push receiver video call
  async getReveiverVideoCall(receiverId: string) {

    const dataPush = {
      Receiver: receiverId
    };
    await this.pushNotificationService.getReveiverVideoCall(dataPush);
  }

  logout() {

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

  // socket 
  userOnlineSocket() {
    if (!this.socketService.socket) {
      this.socketService.connect();
    }

    this.socketService.socket.emit('request_initial_online_users');
  }

  detachSocketEvents() {
    if (this.socketService.socket) {

    }
  }

  // scroll
  @HostListener('window:scroll')
  onWindowScroll(): void {
    const yOffset = window.pageYOffset;
    const scrollTop = this.document.documentElement.scrollTop;
    //this.showButton = (yOffset || scrollTop) > this.scrollHeight;
    this.isScrollAtTop = window.scrollY === 0;
  }

  onScrollTop(): void {
    this.document.documentElement.scrollTop = 0;
  }

  // return 
  goBack(): void {
    this.location.back();
  }

  onEditProfile() {
    this.router.navigate([`admin/profile`]);
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

  // social media
  otherSocialMedia = computed(() =>
    this.socialMediaList().filter(item => item.type !== 'website')
  );

  websites = computed(() =>
    this.socialMediaList().filter(item => item.type === 'website')
  );

  // Función optimizada para el link de WhatsApp
  getSocialLink(item: any): string {
    if (item.type === 'WhatsApp') {
      return `https://wa.me/${item.phonePrefix}${item.phone}/?text=${encodeURIComponent(this.textMessage(item))}`;
    }
    return item.link;
  }

  // Verifica si hay redes sociales (excluyendo websites)
  hasSocialMedia(): boolean {
    return this.userService.userProfile()?.SocialMedia?.some(item => item.type !== 'website') ?? false;
  }

  // Verifica si hay websites
  hasWebsites(): boolean {
    return this.userService.userProfile()?.SocialMedia?.some(item => item.type === 'website') ?? false;
  }

  // get media details
  getMediaDetails(item: any): PostMediaDetails | null {
    return this.postMediaService.getBackgroundImageUrl(item);
  }

  // social media
  getModifiedIconPath(type: any): string {
    return this.socialMediaService.getIconPath(type);
  }

  textMessage(item: any) {
    return `Hello, I just saw your page on ${environment.domain}`;
  }

  // inner text
  innerText(text: any) {
    if (text) {
      return Tools.innerTextIcon(text);
    } else {
      return null;
    }
  }

  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // read more
  isTextLong(text: string): boolean {
    const maxLength = 57;
    return text.length > maxLength;
  }

  toggleText(): void {
    this.showFullText.set(!this.showFullText());
  }

  // roles
  getRoles(role: string): boolean {
    return !!this.userService.userProfile()?.roles?.includes(role as UserRole);
  }

  // current user
  isCurrentUser() {
    return this.authService.user()?._id === this.userService.userProfile()?._id;
  }

  // button class
  buttonClass() {
    return Tools.buttonClass();
  }

  // Sanitizar el HTML
  getSafeHtml(text: string): SafeHtml {
    text = Tools.innerText(text);
    const textHtml = this.sanitizer.bypassSecurityTrustHtml(text);
    return textHtml;
  }
}
