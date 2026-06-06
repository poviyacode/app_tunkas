import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ApplicationRef, Component, ComponentRef, effect, ElementRef, HostListener, Inject, inject, OnInit, PLATFORM_ID, signal, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { environment } from '@environments/environment';
import { SeoService } from '@services/seo.service';
import { MetaTag } from '@interfaces/metaTags';
import { UserService } from '@services/user.service';
import { filter, first, Subject, takeUntil } from 'rxjs';
import { User } from '@interfaces/user';
import { ToastService } from '@services/toast.service';
import videojs from 'video.js';
import Hls from 'hls.js';
import { DialogService } from '@services/dialog.service';
import { SpinnerService } from '@services/spinner.service';
import { TipService } from '@services/tip.service';
import { PostService } from '@services/post.service';
import { PostMedia } from '@interfaces/postMedia';
import { AuthService } from '@services/auth.service';
import { SubscriptionService } from '@services/subscription.service';
import { DomSanitizer, SafeHtml, SafeResourceUrl, Title } from '@angular/platform-browser';
import { Post } from '@interfaces/post';
import { Tools } from '@core/common/tools';
import { BookmarkService } from '@services/bookmark.service';
import { CommentsPostComponent } from '@layout/post/pages/comments-post/comments-post.component';
import { TipComponent } from '@shared/tip/tip.component';
import { TranslateModule } from '@ngx-translate/core';
import CreatePostComponent from '@layout/admin/create/create-post/create-post.component';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { IconDirective } from '@directive/coin-svg.directive';
import { ThousandsPipe } from '@pipes/thousands.pipe';
import CreateAdComponent from '@layout/admin/create/create-ad/create-ad.component';
import { ModalLoginAuthComponent } from '@layout/auth/pages/modal-login-auth/modal-login-auth.component';
import { ToolsService } from '@services/tools.service';
import { CloudflareService } from '@services/cloudflare.service';
import { UserCreditService } from '@services/user-credit.service';
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { DownloadService } from '@services/download.service';
import { SocketService } from '@services/socket.service';
import { ChatService } from '@services/chat.service';
import { MessageService } from '@services/message.service';
import { v4 as uuidv4 } from 'uuid';
import { KissService } from '@services/kiss.service';

@Component({
  selector: 'app-details-post',
  imports: [
    CommonModule,
    RouterModule,
    IconDirective,
    ThousandsPipe,
    TranslateModule
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

    trigger('expandCollapse', [
      // Estado inicial (colapsado)
      state('collapsed', style({
        overflow: 'hidden',
        height: '4rem', // Altura para 2-3 líneas
        opacity: 1
      })),
      // Estado expandido
      state('expanded', style({
        overflow: 'hidden',
        height: '*', // Altura automática
        opacity: 1
      })),
      // Transición entre estados
      transition('collapsed <=> expanded', animate('300ms ease-in-out')),
    ])
  ],
  templateUrl: './details-post.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './details-post.component.scss'
})
export default class DetailsPostComponent {

  isBrowser: boolean;
  isServer: boolean;
  isLoading = signal(false);
  private destroy$ = new Subject<void>();

  // container
  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;

  // video
  isVideoLoading = signal(false);
  @ViewChild('videoElement', { static: true }) videoElement!: ElementRef;
  player!: any;
  isPlaying: boolean = true; // Estado de reproducción
  videoUrl: SafeResourceUrl | undefined;
  isLoadingVideo = signal(false);
  private currentPlayerId: string | null = null;

  // index
  currentLinghtbox = signal<PostMedia | null>(null);
  mediaCurrentIndex = 0;
  postCurrentIndex: number;
  currentPrivate = signal(false);


  //touch
  touchStartX: number = 0;
  touchStartY: number = 0;
  changeOccurred: boolean = false;

  // route
  currentRoute = signal<string | null>(null);

  //read more
  showFullText = signal(false);

  private hls: any;

  //  component
  private createPostComponentRef: ComponentRef<CreatePostComponent> | null = null;
  private createPostAdComponentRef: ComponentRef<CreateAdComponent> | null = null;
  private commentsPostComponentRef: ComponentRef<CommentsPostComponent> | null = null;
  private tipComponentRef: ComponentRef<TipComponent> | null = null;
  private modalLoginAuthComponentRef: ComponentRef<ModalLoginAuthComponent> | null = null;
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;

  private platformId = inject(PLATFORM_ID);
  private activatedRoute = inject(ActivatedRoute);
  private seoService = inject(SeoService);
  public userService = inject(UserService);
  public toastService = inject(ToastService);
  private applicationRef = inject(ApplicationRef);
  public dialogService = inject(DialogService);
  private spinnerService = inject(SpinnerService);
  private tipService = inject(TipService);
  postService = inject(PostService);
  authService = inject(AuthService);
  subscriptionService = inject(SubscriptionService);
  sanitizer = inject(DomSanitizer);
  router = inject(Router);
  private bookmarkService = inject(BookmarkService);
  private title = inject(Title);
  private toolsService = inject(ToolsService);
  cloudflareService = inject(CloudflareService);
  public userCreditService = inject(UserCreditService);
  public transactionCreditService = inject(TransactionCreditService);
  public downloadService = inject(DownloadService);
  private socketService = inject(SocketService);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private kissService = inject(KissService);

  constructor() {

    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    const slug = this.activatedRoute.snapshot.paramMap.get('slug');

    if (slug) {

      effect(() => {

        if (this.postService.post()) {

          this.mediaCurrentIndex = this.postService.post()!.currentIndex! ? this.postService.post()!.currentIndex! : 0;

          if (this.postService.post()?.PostMedia?.length! > 0) {
            this.currentLinghtbox.set(this.postService.post()!.PostMedia![this.mediaCurrentIndex]);
          }

          if (this.postService.postsSwiping().length > 0) {
            this.postCurrentIndex = this.postService.postsSwiping()!.findIndex(post => post._id === this.postService.post()!._id);
          }

          this.updateVideoUrl();

          if (this.postService.post()?.route) {
            this.currentRoute.set(this.postService.post()?.route!);
          }
        }
      });

      if (this.postService.post()?.slug !== slug) {
        this.postService.resetPost();
        this.findOneSlug(slug);
      } else {
        this.findOneSlug(slug);
        this.spinnerService.close();
      }
    }

    this.lockScroll();
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.applicationRef.isStable.pipe(first(stable => stable)).subscribe(() => {

      });
    }
  }

  ngAfterViewInit() {
    this.updateVH();
    window.addEventListener('resize', this.updateVH);

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    window.removeEventListener('resize', this.updateVH);

    this.unlockScroll();

    this.destroyVideoPlayer();

    // component
    this.clearCreatePostComponent();
    this.clearCreatePostAdComponent();
    this.clearCommentsPostComponent();
    this.clearTipComponent();

    //reset
    this.resetPost();

    //hls
    if (this.hls) {
      this.hls.destroy(); // Libera recursos cuando el componente se destruye
    }
  }

  //post
  findOneSlug(slug: string): void {
    this.spinnerService.start();
    const data: any = {
      slug: slug,
    }

    if (this.authService.user()) {
      data.User = this.authService.user()?._id
    }

    this.postService.findOneSlug(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.data) {
            if (!this.postService.post()) {
              this.postService.addPost(res.data);
            } else {
              this.postService.updatePost({
                ...res.data
              });
            }
            this.headPage(res.data);
            this.updateVideoUrl();
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
        },
        complete: () => {
          this.spinnerService.close();
        }
      });
  }

  getCurrentSlideNumber(): number {
    return this.mediaCurrentIndex + 1;
  }

  getTotalSlideCount(): number {
    return this.postService.post()!.PostMedia!.length;
  }

  nextPost() {

    // Si es el último video, vuelve al primero
    //if (this.postCurrentIndex < this.postService.postsSwiping().length - 1) {
    this.postCurrentIndex = (this.postCurrentIndex + 1) % this.postService.postsSwiping().length;
    this.postService.addPost(this.postService.postsSwiping()[this.postCurrentIndex]);
    //this.router.navigate([this.postService.post()!.User?.username, 'pu', this.postService.post()!.slug]);
    //}

    // Verificar si el nuevo media es video
    const currentMedia = this.postService.post()!.PostMedia![this.mediaCurrentIndex];
    console.log('next', this.currentLinghtbox()?.type);
    console.log('next', currentMedia?.type);
    if (this.currentLinghtbox()?.type === 'video') {
      this.pauseVideoHls();
    }

    this.updateVideoUrl();

    this.findOneSlug(this.postService.post()?.slug!);
    //this.verifiedPrivate(this.postService.post()!);
  }

  prevPost() {

    // Si es el primer video, vuelve al último
    //if (this.postCurrentIndex > 0) {
    this.postCurrentIndex = (this.postCurrentIndex - 1 + this.postService.postsSwiping().length) % this.postService.postsSwiping().length;
    this.postService.addPost(this.postService.postsSwiping()[this.postCurrentIndex]);
    //this.router.navigate([this.postService.post()!.User?.username, 'pu', this.postService.post()!.slug]);
    //}

    // Verificar si el nuevo media es video
    const currentMedia = this.postService.post()!.PostMedia![this.mediaCurrentIndex];
    console.log('prev', this.currentLinghtbox()?.type);
    console.log('prev', currentMedia?.type);
    if (this.currentLinghtbox()?.type === 'video') {
      this.pauseVideoHls();
    }

    this.updateVideoUrl();
    this.findOneSlug(this.postService.post()?.slug!);
    //this.verifiedPrivate(this.postService.post()!);
  }

  prevCarouselMedia() {
    this.mediaCurrentIndex = this.mediaCurrentIndex === 0 ? this.postService.post()!.PostMedia!.length - 1 : this.mediaCurrentIndex - 1;
    this.currentLinghtbox.set(this.postService.post()!.PostMedia![this.mediaCurrentIndex]);
    this.pauseVideoHls();
    this.updateVideoUrl();
  }

  nextCarouselMedia() {
    this.mediaCurrentIndex = (this.mediaCurrentIndex + 1) % this.postService.post()!.PostMedia!.length;

    this.currentLinghtbox.set(this.postService.post()!.PostMedia![this.mediaCurrentIndex]);
    this.pauseVideoHls();
    this.updateVideoUrl();
  }

  updateVideoUrl() {

    if (this.postService.post()!.PostMedia?.length === 0) {
      return;
    }

    const postMedia: PostMedia = this.postService.post()!.PostMedia![this.mediaCurrentIndex];

    if (postMedia?.type === 'video') {
      const postMedia = this.postService.post()!.PostMedia![this.mediaCurrentIndex];
      const videoSrc = postMedia.cloudflare.result.playback.hls;
      const newPlayerId = `${postMedia._id}-${videoSrc}`;
      console.log(this.currentPlayerId, newPlayerId);
      if (this.currentPlayerId === newPlayerId) {
        return;
      }

      this.currentPlayerId = newPlayerId;

      const videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(videoSrc)
      this.initVideoPlayer(videoSrc);
    }
  }

  verifiedPrivate(item: Post) {
    if (!item) {
      return false;
    }

    const post = item;
    const currentSubscriptionDate = item?.currentSubscriptionDate || 0;
    const expirationDate = item?.Subscription?.expirationDate || 0;

    const daysDifference = this.postService.calculateDaysDifference(currentSubscriptionDate, expirationDate);
    let currentPrivate = false;

    if (post.typeView === 'FREE' || this.authService?.user()?._id === post?.User?._id) {
      currentPrivate = false;
    } else {

      if (Number(daysDifference) > 0) {
        currentPrivate = false;
      } else {
        currentPrivate = true;
      }
    }

    if (currentPrivate) {
      this.pauseVideoHls();
    }

    return currentPrivate;
  }

  // modal
  closeModal() {
    this.dialogService.closeModal();

    if (this.currentRoute()) {
      this.router.navigateByUrl(this.currentRoute()!);
    } else if (this.postService.post()?.type === 'AD') {
      this.router.navigateByUrl('ads');
    }
    else {
      this.router.navigateByUrl(this.postService.post()?.User?.username!);
    }
    //this.location.back();
  }

  resetPost() {

    const post = this.postService.post();

    const dataUpdate = {
      ...post
    };

    const user = this.authService.user();
    if (!user || user._id !== post?.User?._id) {
      this.postService.updateView(dataUpdate).subscribe();
    }

    this.postService.resetPost();
    this.unlockScroll();

  }

  // video
  private initVideoPlayer(videoUrl: string): void {

    this.isPlaying = true;

    const videoSrc = videoUrl; // URL del video HLS

    const video = this.videoElement.nativeElement;

    // --- 1. Eventos del Elemento Video para Control de Carga/Buffering ---

    // Muestra el spinner al inicio de cualquier proceso de carga.
    video.addEventListener('loadstart', () => {
      this.isVideoLoading.set(true);
    });

    // Muestra el spinner si la reproducción se detiene por falta de datos (buffering).
    video.addEventListener('waiting', () => {
      this.isVideoLoading.set(true);
    });

    // Oculta el spinner cuando el video comienza a reproducirse o se reanuda (después de buffering).
    video.addEventListener('playing', () => {
      this.isVideoLoading.set(false);
    });

    // También puedes asegurarte de ocultar el spinner cuando los metadatos han cargado
    // (aunque 'playing' generalmente es suficiente).
    video.addEventListener('loadeddata', () => {
      this.isVideoLoading.set(false);
    });

    if (Hls.isSupported()) {
      this.hls = new Hls({
        maxBufferLength: 30, // Longitud máxima del búfer (en segundos)
        maxMaxBufferLength: 60, // Límite superior del búfer
        lowLatencyMode: true, // Modo de baja latencia
        backBufferLength: 90, // Tiempo de búfer antes de limpiar segmentos antiguos
        fragLoadingRetryDelay: 500, // Retraso entre reintentos de carga de fragmentos
        fragLoadingMaxRetry: 3, // Número máximo de reintentos de carga de fragmentos
        capLevelToPlayerSize: true // Limita la calidad del video al tamaño del reproductor
      });

      this.hls.loadSource(videoSrc);
      this.hls.attachMedia(video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('Reproduciendo video HLS...');
        video.play().catch((error: any) => {
          console.warn('Autoplay bloqueado:', error);
        });
      });

      this.hls.on(Hls.Events.ERROR, (event: any, data: any) => {

        if (data.fatal) {

          this.isVideoLoading.set(false);

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              this.hls.startLoad(); // Intenta cargar nuevamente
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              this.hls.recoverMediaError(); // Intenta recuperarse del error de medios
              break;
            default:
              this.hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', () => {
        this.isVideoLoading.set(false);
        video.play().catch((error: any) => {
          console.warn('Autoplay bloqueado:', error);
        });
      });
    } else {
      console.error('Tu navegador no admite HLS ni HLS.js.');
      this.isVideoLoading.set(false);
    }

    // Agregar eventos de clic al video
    video.addEventListener('click', () => {
      this.togglePlayPause();
    });

    video.addEventListener('touchstart', () => {
      this.togglePlayPause();
    });

    // Agregar el evento 'ended' para reiniciar el video
    video.addEventListener('ended', () => {
      this.restartVideoHls();
    });
  }

  togglePlayPauseHls(): void {
    const video = this.videoElement.nativeElement;

    if (this.isPlaying) {
      video.pause();
    } else {
      video.play().catch((error: any) => {
        console.warn('Error al reproducir el video:', error);
      });
    }

    this.isPlaying = !this.isPlaying; // Cambiar el estado
  }

  restartVideoHls(): void {
    const video = this.videoElement.nativeElement;

    // Reiniciar el video
    video.currentTime = 0; // Vuelve al inicio del video
    video.play().catch((error: any) => {
      console.warn('Error al reiniciar el video:', error);
    });

    this.isPlaying = true; // Asegura que el estado sea "reproduciendo"
  }

  playVideoHls(): void {
    const video = this.videoElement.nativeElement;
    video.play().catch((error: any) => {
      console.warn('Error al reproducir el video:', error);
    });
  }

  pauseVideoHls(): void {
    const video = this.videoElement.nativeElement;
    video.pause();
  }

  // video js
  private initVideoPlayerVideoJs(videoUrl: string): void {
    if (this.isBrowser) {
      this.isPlaying = true;
      // Cambiar el video después de actualizar el índice

      //const postMedia = this.postService.post()!.PostMedia![this.mediaCurrentIndex];
      //const videoSrc = postMedia.cloudflare.result.playback.hls;
      const videoSrc = videoUrl;
      // Verificar si ya existe un reproductor y eliminarlo antes de inicializar uno nuevo
      if (this.player) {
        //this.player.dispose();
        this.player = null;
      }

      this.player = videojs(this.videoElement.nativeElement, {
        controls: false, // Deshabilitar controles principales
        autoplay: true,
        loop: true,
        muted: false,
        preload: 'auto',
        inactivityTimeout: 0, // Evita que aparezcan controles al mover el mouse
        userActions: {
          doubleClick: false, // Deshabilita la acción de doble click
          hotkeys: false // Deshabilita atajos de teclado
        }
      });

      this.player.tech_.setControls(false); // Deshabilita controles nativos del navegador
      this.player.userActive(false); // Evita estados activos del usuario

      if (videoSrc) {
        this.player.src({ src: videoSrc, type: 'application/x-mpegURL' });
      }

      // Manejar eventos de carga
      this.player.on('waiting', () => this.handleLoading());
      this.player.on('playing', () => this.handleLoaded());
      this.player.on('loadstart', () => this.handleLoading());
      this.player.on('loadeddata', () => this.handleLoaded());
      this.player.on('canplay', () => this.handleLoaded());
      this.player.on('canplaythrough', () => this.handleLoaded());

      this.player.ready(() => {
        this.player.play().catch(() => {
          console.warn('Autoplay bloqueado, esperando interacción del usuario...');
        });
      });

      // Ocultar elementos específicos del reproductor
      this.player.ready(() => {
        const controlBar = document.querySelector('.vjs-control-bar');
        const bigPlayButton = document.querySelector('.vjs-big-play-button');

        if (controlBar) controlBar.setAttribute('style', 'display: none !important;');
        if (bigPlayButton) bigPlayButton.setAttribute('style', 'display: none !important;');
      });

    }
  }

  private handleLoading(): void {
    if (!this.isLoadingVideo()) {
      this.isLoadingVideo.set(true);
      this.applicationRef.tick(); // Forzar actualización de la UI
      console.log('El video está cargando...');
    }
  }

  private handleLoaded(): void {
    if (this.isLoadingVideo) {
      this.isLoadingVideo.set(false);
      this.applicationRef.tick(); // Forzar actualización de la UI
      console.log('El video ha cargado suficiente contenido');
    }
  }

  // Método para verificar estado de carga actual
  checkBufferingState(): boolean {
    if (!this.player) return false;

    // Verificar el estado de la red
    const networkState = this.player.networkState();
    const isBuffering = this.player.hasClass('vjs-waiting');

    return this.isLoadingVideo() || networkState === 2 || isBuffering;
  }


  // Obtener porcentaje de buffer
  getBufferedPercentage(): number {
    if (!this.player) return 0;

    const duration = this.player.duration();
    const buffered = this.player.buffered();

    if (!buffered || duration === 0) return 0;

    return (buffered.end(buffered.length - 1) / duration) * 100;
  }

  // Verificar si está buscando (buffering activo)
  isSeeking(): boolean {
    return this.player && this.player.seeking();
  }

  // Obtener tiempo de buffer restante
  getRemainingBufferTime(): number {
    if (!this.player) return 0;

    const currentTime = this.player.currentTime();
    const buffered = this.player.buffered();

    if (!buffered || buffered.length === 0) return 0;

    return buffered.end(buffered.length - 1) - currentTime;
  }

  playVideo(): void {
    if (this.player) {
      this.player.play();
    }
  }

  pauseVideo(): void {
    if (this.player) {
      this.player.pause();
    }
  }

  togglePlayPause(): void {
    if (this.player) {
      if (this.isPlaying) {
        this.player.pause();
      } else {
        this.player.play();
      }
      this.isPlaying = !this.isPlaying; // Cambiar el estado
    }
  }

  private destroyVideoPlayer(): void {
    if (this.player) {
      this.player.off('waiting');
      this.player.off('playing');
      this.player.off('loadstart');
      this.player.off('loadeddata');
      this.player.off('canplay');
      this.player.off('canplaythrough');
      this.player.dispose();
      this.player = null;
    }
    this.videoUrl = undefined; // Limpiar la URL del video
  }

  // touch
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.changeOccurred = false;
  }

  onTouchMove(event: TouchEvent): void {

    const touchEndX = event.touches[0].clientX;
    const touchEndY = event.touches[0].clientY;
    const deltaX = this.touchStartX - touchEndX;
    const deltaY = this.touchStartY - touchEndY;

    if (!this.changeOccurred) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
        if (deltaX > 0) {
          this.nextCarouselMedia(); // Deslizó a la izquierda
        } else {
          this.prevCarouselMedia(); // Deslizó a la derecha
        }
        this.changeOccurred = true;
      }
      else if (Math.abs(deltaY) > 5) { // Si es un movimiento vertical
        if (deltaY > 0) {
          this.nextPost(); // Deslizó hacia arriba
        } else {
          this.prevPost(); // Deslizó hacia abajo
        }
        this.changeOccurred = true;

      }
    }
  }

  // scroll x y
  onScroll(event: WheelEvent) {

    if (event.deltaY > 0) {
      this.nextPost(); // Deslizó hacia arriba
    } else {
      this.prevPost(); // Deslizó hacia abajo
    }

  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {

    if (event.key === 'ArrowUp') {
      this.nextPost(); // Deslizó hacia arriba
    } else if (event.key === 'ArrowDown') {
      this.prevPost(); // Deslizó hacia abajo
    } else if (event.key === 'ArrowLeft') {
      this.prevCarouselMedia();
    } else if (event.key === 'ArrowRight') {
      this.nextCarouselMedia();
    } else if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  // hidden scroll
  updateVH() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }

  lockScroll() {
    document.body.style.overflow = 'hidden';
  }

  unlockScroll() {
    document.body.style.overflow = 'auto';
  }

  // seo 
  headPage(post?: Post) {

    const data: MetaTag = {
      title: post?.title || post?.description || `${'Hot sex 👉👌😋'}`,
      description: post?.title ? post?.description : `I'm hot I want to fuck 👉👌😋`,
      path: `pu/${post?.slug}`,
      url: `${post?.typeView === 'SUBSCRIBERS' ? environment.urlPrivate : environment.urlCurrent}/pu/${post?.slug}`,
      image: post?.urlSeo ? post.urlSeo : `${environment.domain}/public/logo/dating.jpg`
    };

    const title = `${data.title}`;
    this.title.setTitle(title!);

    this.seoService.updateMetaTags(data);
  }

  // dropdown
  onModalDropdown(post: Post) {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    this.postService.addPost(post);
    this.dialogService.toggleModal('dropdownPost');

  }

  // comments
  onCommentPost(post: Post) {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    this.postService.resetPost();
    this.postService.addPost(post);

    this.onCommentPostModal();
  }

  // tip
  onTip(post: Post) {
    const dataTip = {
      type: 'TIP_POST',
      post: post,
      user: post.User
    };
    this.tipService.addTip(dataTip);

    this.onTipModal();
  }

  // like
  onLikes(post: Post) {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    if (!post || !this.authService.user()) return;

    const likeUpdate = Number(post.likes! + 1);

    this.postService.post()!.likes = likeUpdate;
    this.postService.updatePosts(post._id!, { likes: likeUpdate });

    this.postService.likes(post._id!, { likes: likeUpdate }).pipe(takeUntil(this.destroy$)).subscribe();
  }

  // share
  share(post: Post) {
    if (navigator.share) {
      navigator.share({
        title: post.description !== null ? post.description : `I'm hot, fuck me 👉👌😋`,
        text: `I want to have sex with you, soft and hard 👉👌😋`,
        url: `${post?.typeView === 'SUBSCRIBERS' ? environment.urlPrivate : environment.urlCurrent}/pu/${post?.slug}`,
      })
        .then(() => console.log('Content shared successfully'))
        .catch((error) => console.log('Error al share:', error));
    } else {
      console.log('The Web Share API is not available in this browser');
    }
  }

  // edit
  onEditPostModal(post: Post) {
    this.postService.resetPost();
    this.postService.addPost(post);

    if (this.postService.post()?.type === 'POST') {
      this.onCreatePostModal();
    } else if (this.postService.post()?.type === 'AD') {
      this.onCreatePostAdModal();
    }

  }

  // delete
  onDeletePostModal(post: Post): void {
    this.dialogService.closeModal();
    this.dialogService.toggleModal('deletePost');
  }

  onDeletePost(event: Event): void {
    event.preventDefault();

    this.dialogService.closeModal();
    this.router.navigateByUrl(this.postService.post()!.User?.username!);
    this.spinnerService.start();

    const postId = this.postService.post()!._id!;
    if (!postId) return;

    this.postService.delete(postId)
      .subscribe({
        next: (res) => {
          if (res) {
            this.postService.removePosts(postId);
            this.postService.removePostsUser(postId);
            this.postService.removePostsSwiping(postId);
            this.postService.resetPost();
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
          console.error('Error deleting', err);
        },
        complete: () => {
          this.spinnerService.close();
          this.toastService.start({ type: 'success', message: 'deletedSuccessfully' });
        }
      });
  }

  // bookmark 
  addPostBookmark(item: Post, value: any): void {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    this.dialogService.closeModal();
    if (this.authService.user()!) {
      const data = {
        Post: item._id,
      }

      this.postService.updatePost({
        isBookmarked: true,
      });

      this.bookmarkService.create(data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res) {
              this.postService.updatePost({
                isBookmarked: true,
                Bookmark: res
              });

              this.postService.updatePostsUser(item._id!, {
                isBookmarked: true,
                Bookmark: res
              });

              this.postService.updatePostsSwiping(item._id!, {
                isBookmarked: true,
                Bookmark: res
              })
            }
          },
          error: (err) => {
            this.postService.updatePost({
              isBookmarked: false
            });
          },
          complete: () => {
            this.toastService.start({ type: 'success', message: 'itWasSaved' });
          }
        });

    }
  }

  deletePostBookmark(item: Post, value: any): void {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    this.dialogService.closeModal();
    if (this.authService.user()!) {
      const data = {
        Post: item._id,
      }

      this.postService.updatePost({
        isBookmarked: false
      });

      this.bookmarkService.deleteUser(data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res && res.deletedCount === 0) {
              this.postService.updatePost({
                isBookmarked: true
              });
            } else if (res && res.deletedCount === 1) {
              if (item.Bookmark) {
                this.postService.updatePost({
                  Bookmark: null!,
                });
                this.bookmarkService.removeBookmarks(item.Bookmark._id!);

                this.postService.updatePostsUser(item._id!, {
                  isBookmarked: false,
                  Bookmark: null!
                });

                this.postService.updatePostsSwiping(item._id!, {
                  isBookmarked: false,
                  Bookmark: null!
                });

              }
            }
          },
          error: (err) => {

          },
          complete: () => {
            this.toastService.start({ type: 'success', message: 'itWasDeleted' });
          }
        });
    }
  }

  // pin to tops
  onPinToTop(item: Post): void {
    if (this.authService.user()!?._id === item.User?._id) {
      const data = {
        pined: item.pined == true ? false : true,
      };
      this.dialogService.closeModal();
      this.postService.updatePined(item._id!, data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            const poToUpdatePosts = this.postService.posts().find((item) => item._id === this.postService.post()?._id);
            if (poToUpdatePosts) {
              this.postService.updatePosts(this.postService.post()!._id!, {
                pined: item.pined == true ? false : true,
              });
            }

            const poToUpdatePostsUser = this.postService.postsUser().find((item) => item._id === this.postService.post()?._id);
            if (poToUpdatePostsUser) {

              if (item.pined === false) {
                this.postService.removePostsUser(this.postService.post()?._id!);
                const currentPostsUser = this.postService.postsUser();
                const updatedPostsUser = [poToUpdatePostsUser, ...currentPostsUser];
                this.postService.addPostsUser(updatedPostsUser);
              }

              this.postService.updatePostsUser(this.postService.post()!._id!, {
                pined: item.pined == true ? false : true,
              });
            }
          },
          error: (err) => {
            this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
            console.error('Error updating pin', err);
          },
          complete: () => {
            this.toastService.start({ type: 'success', message: 'completedSuccessfully' });
          }
        });
    }
  }

  // button action
  openTelegram(telegramUsername: string): void {

    if (!this.authService.user()) {
      this.onLoginModal();
      return;
    }

    const telegramUrl = `https://t.me/${telegramUsername}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  }

  openWhatsApp(phonePrefix: string, whatsappNumber: string, message: string): void {

    if (!this.authService.user()) {
      this.onLoginModal();
      return;
    }

    const whatsappUrl = `https://wa.me/${phonePrefix}${whatsappNumber}/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  // copy text
  copyText(post: Post) {
    this.dialogService.closeModal();

    const textToCopy = `${post?.typeView === 'SUBSCRIBERS' ? environment.urlPrivate : environment.urlCurrent}/pu/${post?.slug}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.toastService.start({ type: 'success', message: 'copied_link' });
      console.log('El texto ha sido copiado al portapapeles');
    }, (err) => {
      console.error('Error al copiar el texto al portapapeles: ', err);
    });

  }

  // read more
  isTextLong(text: string): boolean {
    const maxLength = 39;
    return text.length > maxLength;
  }

  toggleText(): void {
    this.showFullText.set(!this.showFullText());
  }

  // inner
  innerText(text: any) {
    return Tools.innerText(text);
  }

  // text
  textMessage(item: Post) {
    return `Hello, I just saw your page on ${environment.domain}, `
      + Tools.cropText(item.title!, 25) + '(...) '
      + ` https://${environment.domain}/pu/` + item.slug;
  }

  // Sanitizar el HTML
  getSafeHtml(text: string): SafeHtml {
    text = Tools.innerText(text);
    const textHtml = this.sanitizer.bypassSecurityTrustHtml(text);
    return textHtml;
  }

  //
  getProfileImageUrl(user: User): string {
    const userProfile = user;
    if (!userProfile || !userProfile.Profile || userProfile.Profile.length === 0) {
      return '';
    }

    const profile = userProfile.Profile[0];

    if (profile.cloudflare && profile.cloudflare.result && profile.cloudflare.result.variants && profile.cloudflare.result.variants.length > 0) {
      return profile.cloudflare.result.variants[0];
    }

    return profile.url || '';
  }

  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // purchase 
  async openCreditPurchase() {
    this.onCreditPurchase();
  }

  // download
  async onDownloadPostModal(post: Post) {
    const user = this.authService.user()!;
    if (user && user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    this.dialogService.closeModal();

    if (!this.authService.user()) {
      this.onLoginModal();
      return;
    }

    if (
      this.postService.post()?.Download ||
      this.authService.user()?._id === this.postService.post()?.User?._id ||
      this.postService.post()?.typeView === 'FREE'
    ) {
      if (this.currentLinghtbox()?.type === 'video') {
        const uid = this.currentLinghtbox()!.cloudflare.result['uid'];
        this.onDownloadVideo(uid);
      } else if (this.currentLinghtbox()?.type === 'image') {
        const url = this.currentLinghtbox()!.cloudflare.result.variants[0];
        this.onDownloadImage(url);
      }
    } else {
      this.dialogService.toggleModal('downloadPost');
    }
  }

  onDownloadVideo(uid: string): void {
    this.spinnerService.start();
    this.dialogService.closeModal();
    const data = {
      videoUID: uid
    };

    this.cloudflareService.downloadVideo(data).subscribe({
      next: (res) => {

        if (res && res.result && res.result.default.status === 'ready') {

          const link = document.createElement('a');
          link.href = res.result.default.url;
          link.setAttribute('download', `${Date.now()}.mp4`);
          //link.setAttribute('target', '_blank');

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          this.toastService.start({ type: 'success', message: 'downloadSuccessful' });

          // register
          if (!this.postService.post()?.Download) {
            this.onTransactionDownloadPost();
          }

        } else if (res && res.result && res.result.default.status === 'inprogress') {
          this.toastService.start({ type: 'success', message: 'inProgress' });
        } else {
          this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
        }

        this.spinnerService.close();
      },
      error: (error) => {
        this.spinnerService.close();
        this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
      },
      complete: () => {
        this.spinnerService.close();
      }
    });
  }

  onDownloadImage(url: string): void {
    this.dialogService.closeModal();
    this.spinnerService.start();
    this.cloudflareService.downloadImage(url);
    this.spinnerService.close();

    // register
    if (!this.postService.post()?.Download) {
      this.onTransactionDownloadPost();
    }

    this.toastService.start({ type: 'success', message: 'downloadSuccessful' });
  }

  onTransactionDownloadPost() {

    const creditAmountDownload = this.postService.post()?.User?.creditAmountDownload;

    const data = {
      creditAmount: Number(creditAmountDownload),
      type: 'POST_DOWNLOAD',
      Receiver: this.postService.post()?.User,
      Post: this.postService.post()?._id,
    }

    this.transactionCreditService.createTransfer(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.postService.updatePost({ Download: res.Download });
            this.toastService.start({ type: 'success', message: 'completedSuccessfully' });

            this.kissService.start(2500);

            const dataMessage = {
              Receiver: this.userService.userProfile()!,
              Sender: this.authService.user(),
              type: 'POST',
              credit: Number(creditAmountDownload),
              message: `${Number(creditAmountDownload)} publication download`,
            };

            this.onMessage(dataMessage);
          }
        },
        error: (err) => {
          this.spinnerService.close();
        },
        complete: () => {
          this.spinnerService.close();
          console.log('Request completed');
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

  //modal external
  onCreatePostModal() {
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

  onCreatePostAdModal() {
    this.clearCreatePostAdComponent();
    const componentRef = this.viewContainerRef.createComponent(CreateAdComponent);
    this.createPostAdComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearCreatePostAdComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
    });
    this.dialogService.toggleModal('createPostAd');
  }

  private clearCreatePostAdComponent() {
    if (this.createPostComponentRef) {
      this.createPostComponentRef.destroy();
      this.createPostComponentRef = null;
    }
  }

  onCommentPostModal() {
    this.clearCommentsPostComponent();
    const componentRef = this.viewContainerRef.createComponent(CommentsPostComponent);
    this.commentsPostComponentRef = componentRef;
    componentRef.instance.closeModal.subscribe(() => {
      this.clearCommentsPostComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
    });
    this.dialogService.toggleModal('commentPost');
  }

  private clearCommentsPostComponent() {
    if (this.commentsPostComponentRef) {
      this.commentsPostComponentRef.destroy();
      this.commentsPostComponentRef = null;
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

  // button class
  buttonClass() {
    return Tools.buttonClass();
  }

  buttonSecondaryClass() {
    return Tools.buttonSecondaryClass();
  }
}
