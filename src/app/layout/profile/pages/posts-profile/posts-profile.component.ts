import { CommonModule, isPlatformBrowser, isPlatformServer, Location } from '@angular/common';
import { ApplicationRef, ChangeDetectionStrategy, Component, ComponentRef, effect, ElementRef, EnvironmentInjector, HostListener, inject, Inject, PLATFORM_ID, QueryList, runInInjectionContext, signal, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { Tools } from '@core/common/tools';
import { environment } from '@environments/environment';
import { Post } from '@interfaces/post';
import { User } from '@interfaces/user';
import CreatePostComponent from '@layout/admin/create/create-post/create-post.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { DialogService } from '@services/dialog.service';
import { PostService } from '@services/post.service';
import { SubscriptionService } from '@services/subscription.service';
import { UserService } from '@services/user.service';
import { first, Subject, takeUntil } from 'rxjs';
import { SpinnerService } from '@services/spinner.service';
import { v4 as uuidv4 } from 'uuid';
import { IconDirective } from '@directive/coin-svg.directive';
import { sign } from 'node:crypto';
import { UserCreditService } from '@services/user-credit.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import { Subscription } from '@interfaces/subscription';
import { ToolsService } from '@services/tools.service';
import { EmailService } from '@services/email.service';
import { ToastService } from '@services/toast.service';
import { PushNotificationService } from '@services/push-notitication.service';
import { PostMediaDetails } from '@interfaces/postMedia';
import { PostMediaService } from '@services/post-media.service';
import PostCardComponent from '@shared/post-card/post-card.component';

@Component({
  selector: 'app-posts-profile',
  imports: [
    RouterModule,
    TranslateModule,
    IconDirective,
    CommonModule,
    PostCardComponent
  ],
  templateUrl: './posts-profile.component.html',
  styleUrl: './posts-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export default class PostsProfileComponent {

  slug: string;

  // page
  loading = signal(false);
  totalPages: number = 0;
  currentPage = 0;
  limitPage = 10;
  hasMore: boolean = true;

  // tag
  currentTag = signal<string | null>(null);

  // suscription
  suscription = signal<Subscription | null>(null);

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private destroy$ = new Subject<void>();
  currentRoute: string = '';

  //  component
  private createPostComponentRef: ComponentRef<CreatePostComponent> | null = null;
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;

  private activatedRoute = inject(ActivatedRoute);
  public userService = inject(UserService);
  public authService = inject(AuthService);
  public postService = inject(PostService);
  public dialogService = inject(DialogService);
  private router = inject(Router);
  subscriptionService = inject(SubscriptionService);
  spinnerService = inject(SpinnerService);
  private userCreditService = inject(UserCreditService);
  private transactionCreditService = inject(TransactionCreditService);
  private toolsService = inject(ToolsService);
  private emailService = inject(EmailService);
  private toastService = inject(ToastService);
  private pushNotificationService = inject(PushNotificationService);
  private postMediaService = inject(PostMediaService);

  constructor() {

    effect(() => {
      this.suscription.set(this.userService.userProfile()?.Subscription!);
    });

    this.activatedRoute.queryParams.subscribe(params => {
      this.currentTag.set(params['tag']);

      if (!this.currentTag()) {
        this.currentTag.set('all');
      } else {
        this.onFind();
      }
    });

    this.activatedRoute.paramMap.subscribe((params) => {
      this.slug = params.get('slug')!;
      this.onFind();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.clearCreatePostComponent();

    //reset
    this.postService.resetPostsUser();
    this.postService.resetPostsSwiping();
  }

  onFind() {
    if (this.slug) {
      this.postService.resetPostsUser();
      this.postService.resetPostsSwiping();
      this.hasMore = true;
      this.currentPage = 0;
      this.findAllPostUser(this.slug);
      this.currentTag.set(null);
    }
  }

  // find
  findAllPostUser(username: string) {

    if (!this.userService.userProfile() || !this.hasMore) return;

    this.loading.set(true);

    let data: any = {};
    data = {
      username: username,
    }

    if (this.currentTag() && this.currentTag() !== 'all') {
      data.search = this.currentTag();
    }

    const urlSegment = 'FREE';

    if (urlSegment) {
      data.typeView = urlSegment.toUpperCase();
    }

    if (this.authService.user()) {
      data.User = this.authService.user()?._id
    }

    const subscription = this.suscription()!;

    this.postService.findAllUser(data, this.limitPage, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && res.data.length > 0) {

            if (this.currentPage === 0) {
              this.totalPages = res.total;
            }

            const currentPostsUser = this.postService.postsUser();
            const newPosts = res.data.filter((newPost: Post) => {
              return !currentPostsUser.some(existingPost => existingPost._id === newPost._id);
            });

            newPosts.forEach((post: Post) => {
              post.Subscription = subscription;
            });

            const updatedPostsUser = [...currentPostsUser, ...newPosts];
            this.postService.addPostsUser(updatedPostsUser);

            this.hasMore = res.data.length <= this.limitPage;

            // Extraer solo los `Post`
            const currentsSwiping = this.postService.postsSwiping();
            const newSwipingItems = res.data.filter((newPost: Post) => {
              return !currentPostsUser.some(existingPost => existingPost._id === newPost._id);
            });
            const updatedSwipingItems = [...currentsSwiping, ...newSwipingItems];
            this.postService.addPostsSwiping(updatedSwipingItems);

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
        this.findAllPostUser(this.slug);
      }
    }
  }

  onPost(post: Post) {
    this.postService.addPost(post);
    this.router.navigate([this.userService.userProfile()?.username, 'pu', post.slug]);

  }

  verifiedPrivate(item: Post) {
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

    return currentPrivate;
  }

  // create post
  onCreatePost() {
    this.onCreatePostModal();
  }

  // live
  async onStartLiveStream() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    const userCredit = this.userCreditService.userCredit()?.current || 0;
    const gender = this.authService.user()?.gender || 'MAN';

    // if (gender === 'MAN' && Number(userCredit) <= Number(0)) {
    //   this.onCreditPurchase();
    //   return;
    // }

    const data: User = {
      liveRoomId: uuidv4(),
      transmissionType: 'STREAMING',
      videoCall: true
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

          this.getFollowersSreaming();

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

  // get first letter
  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // get media details
  getMediaDetails(item: any): PostMediaDetails | null {
    return this.postMediaService.getBackgroundImageUrl(item);
  }

  // send push live
  async getFollowersSreaming() {
    await this.pushNotificationService.getFollowersSreaming();
  }

  findAllEmailMarketing() {
    const data = {

    }

    this.userService.findAllEmailMarketing(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          for (const item of res) {
            console.log('Processing item:', item);
          }
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

  //modal external
  onCreatePostModal() {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.toastService.start({ type: 'error', message: 'accountSuspended' });
      return;
    }

    // 1. Reinicia el estado del post (opcional, según tu lógica)
    this.postService.resetPost();

    // 2. Limpia cualquier instancia previa del componente hijo
    this.clearCreatePostComponent();

    // 3. Crea dinámicamente el componente hijo
    const componentRef = this.viewContainerRef.createComponent(CreatePostComponent);

    // 4. Guarda la referencia del componente hijo para destruirlo más tarde
    this.createPostComponentRef = componentRef;

    // 5. Escucha el evento closeModal del componente hijo
    componentRef.instance.closeModal.subscribe(() => {
      console.log('The modal is closed from the child');
      this.clearCreatePostComponent(); // Destruye el componente hijo
      this.dialogService.closeModal(); // Cierra el modal visualmente
    });

    // 6. Abre el modal (opcional, según tu lógica)
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

  // button class
  buttonClass() {
    return Tools.buttonClass();
  }

  buttonSecondaryClass() {
    return Tools.buttonSecondaryClass()
  }
  // route
  getCurrentRoute(): string[] {
    if (this.currentRoute) {
      return ['/', this.userService.userProfile()?.username!, this.currentRoute];
    } else {
      return ['/', this.userService.userProfile()?.username!];
    }
  }
}
