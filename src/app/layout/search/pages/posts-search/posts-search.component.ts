import { Component, effect, HostListener, inject, Inject, OnInit, PLATFORM_ID, signal, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { DialogService } from '@services/dialog.service';
import { SpinnerService } from '@services/spinner.service';
import { ToastService } from '@services/toast.service';
import { environment } from '@environments/environment';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { User } from '@interfaces/user';
import { Post } from '@interfaces/post';
import { Subscription } from '@interfaces/subscription';
import { UserService } from '@services/user.service';
import { AuthService } from '@services/auth.service';
import { SubscriptionService } from '@services/subscription.service';
import { Tools } from '@core/common/tools';
import { PostService } from '@services/post.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommentsPostComponent } from '@layout/post/pages/comments-post/comments-post.component';
import { DropdownPostComponent } from '@layout/post/pages/dropdown-post/dropdown-post.component';
import { ModalPostComponent } from '@layout/post/pages/modal-post/modal-post.component';
import { TipComponent } from '@shared/tip/tip.component';
import { TipService } from '@services/tip.service';
import { SearchService } from '@services/search.service';
import { ReadMoreComponent } from '@library/read-more/read-more.component';
import { IconDirective } from '@directive/coin-svg.directive';
import { DateAgoPipe } from '@pipes/date-ago.pipe';
import { ThousandsPipe } from '@pipes/thousands.pipe';
import { Subject, takeUntil } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { PostMediaService } from '@services/post-media.service';
import { PostMediaDetails } from '@interfaces/postMedia';
import { ToolsService } from '@services/tools.service';
import PostCardComponent from '@shared/post-card/post-card.component';

@Component({
  selector: 'app-posts-search',
  imports: [
    TranslateModule,
    IconDirective,
    RouterModule,
    PostCardComponent
],
  templateUrl: './posts-search.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./posts-search.component.scss']
})
export default class PostsSearchComponent {

  urlCurrent = 'posts';
  search: string | null;

  loading = signal(false);
  tag: string | null;
  order: string;

  users: User[] = [];
  posts: Post[] = [];
  post: Post;

  dataTip: object;

  postLoading: string[] = ["hola", "que", "tal"];

  totalPages: number = 0;
  currentPage = 0;
  limitPage = 15;
  dataSearch: any;
  hasMore: boolean = true;
  isFirstElement = true;

  subscription: Subscription | null;
  subscriptions: Subscription[] = [];

  private destroy$ = new Subject<void>();

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  observer: IntersectionObserver;

  public router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  public userService = inject(UserService);
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  private spinnerService = inject(SpinnerService);
  private subscriptionService = inject(SubscriptionService);
  public postService = inject(PostService);
  private tipService = inject(TipService);
  private translateService = inject(TranslateService);
  private searchService = inject(SearchService);
  private activatedRoute = inject(ActivatedRoute);
  private title = inject(Title);
  private postMediaService = inject(PostMediaService);
  private toolsService = inject(ToolsService);

  constructor(
  ) {
    this.search = this.activeRoute.snapshot.queryParamMap.get('q');

    this.activatedRoute.paramMap.subscribe((params) => {
      this.tag = params.get('tag');
      this.title.setTitle(this.tag!);
    });

    this.searchService.sharedData$.subscribe((search) => {
      if (search === 'all') {
        this.search = null;
        this.postService.resetPostsSearch();
      } else {
        this.search = search;
        this.postService.resetPostsSearch();
      }

      this.currentPage = 0;
      this.hasMore = true;

      this.findSearch();
    });
  }

  ngOnInit(): void {
    if (this.postService.postsSearch().length === 0) {
      this.findSearch();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  findSearch() {
    if (!this.hasMore) return;

    this.loading.set(true);
    const data: any = {
      order: this.order === 'recent' ? { createdAt: -1 } : { planAt: -1 },
      type: 'POST'
    };

    if (this.tag) {
      data.search = this.tag;
    }

    // if (this.authService.user()) {
    //   data.User = this.authService.user()?._id;
    // }

    const urlSegment = 'FREE';

    if (urlSegment) {
      //data.typeView = urlSegment.toUpperCase();
    }

    this.postService.findAllSearchPosts(data, this.limitPage, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {

          if (res && res.data.length > 0) {

            if (this.currentPage === 0) {
              this.postService.resetPosts();
              this.postService.resetPostsSwiping();
              this.totalPages = res.total;
            }

            const currentPosts = this.postService.posts();
            const newPosts = res.data.filter((newPost: Post) => {
              return !currentPosts.some(existingPost => existingPost._id === newPost._id);
            });
            const updatedPosts = [...currentPosts, ...newPosts];
            this.postService.addPosts(updatedPosts);
            this.posts = this.postService.posts();

            // Extraer solo los `Post`
            const currentsSwiping = this.postService.postsSwiping();
            const newSwipingItems = res.data.filter((newPost: Post) => {
              return !currentPosts.some(existingPost => existingPost._id === newPost._id);
            });
            const updatedSwipingItems = [...currentsSwiping, ...newSwipingItems];
            this.postService.addPostsSwiping(updatedSwipingItems);


            this.hasMore = res.data.length <= this.limitPage;
          } else {
            this.hasMore = false;
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
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

  onSearch($event: any) {
    this.search = $event.q;
    this.findSearch();
  }

  // post
  onPost(post: Post) {
    this.postService.resetPost();
    const data: Post = {
      ...post,
      route: `search/posts`,
    };
    this.postService.addPost(data);
    this.router.navigate(['search/posts', 'pu', post.slug]);
  }

  // image error
  onImageError(event: Event, thumbnail: any): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = thumbnail;
  }

  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  getMediaDetails(item: any): PostMediaDetails | null {
    return this.postMediaService.getBackgroundImageUrl(item);
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

    return currentPrivate;
  }

  // comments
  onCommentDialog(post: Post) {
    this.viewContainerRef.clear();
    const componentRef = this.viewContainerRef.createComponent(CommentsPostComponent);
    componentRef.instance;

    this.dialogService.toggleModal('commentPost');
    this.postService.addPost(post);
  }

  // dropdown
  closeModalDropdown() {
    this.dialogService.closeModal();
    const dataUpdate = {};
    this.postService.latestPost(dataUpdate).subscribe();
  }

  onModalDropdown(post: Post) {

    this.viewContainerRef.clear();
    const componentRef = this.viewContainerRef.createComponent(DropdownPostComponent);
    componentRef.instance;


    this.dialogService.toggleModal('dropdownPost');
    this.postService.addPost(post);

  }

  //  pin to tops
  onPinToTop(item: Post): void {
    if (this.authService.user()!?._id === item.User?._id) {
      const data = {
        pined: item.pined == true ? false : true,
      };
      this.dialogService.closeModal();
      this.postService.updatePined(item._id!, data).subscribe(res => {
        const postToUpdate = this.posts.find((post) => post._id === item._id);
        if (postToUpdate) {
          postToUpdate.pined = item.pined == true ? false : true;
        }
      });
    }
  }

  // tip
  onTipDialog(post: Post) {

    this.viewContainerRef.clear();
    const componentRef = this.viewContainerRef.createComponent(TipComponent);
    componentRef.instance;

    this.dialogService.toggleModal('tip');

    const dataTip = {
      type: 'TIP_POST',
      post: post,
      user: post.User
    };
    this.tipService.addTip(dataTip);
  }

  // subscription
  subscriptionExpiredQuery(item: Post) {
    let currentPrivate = false;

    const media = item;
    const typeView = media?.typeView;

    if (typeView === 'FREE' || this.authService?.user()?._id === media?.User?._id) {
      currentPrivate = false;
    } else {
      if (media) {
        const subscription = this.subscriptionService.searchSubscribersUserJoin(media.User?.username!);
        if (!subscription) {
          currentPrivate = true;
        }
      }
    }
    return currentPrivate;
  }

  getContentForSuscribe(): string {
    const subscribeContent = `
      <div class="absolute inset-0 text-white backdrop-blur-3xl bg-zinc-100/50 dark:bg-zinc-800/50 m-0 flex flex-col justify-center items-center space-y-2">
        <div class="flex justify-center items-center space-x-1">
          <i class="fa-solid fa-lock"></i>
          <span>${this.translateService.instant('suscribe')}</span>
        </div>
      </div>
    `;

    return subscribeContent;
  }

  // dialog post
  closeModalPost() {
    this.dialogService.closeModal();
    const dataUpdate = {};
    this.postService.latestPost(dataUpdate).subscribe();
  }

  onModalPost(post: Post) {
    this.postService.addPost(post);
    this.viewContainerRef.clear();
    const componentRef = this.viewContainerRef.createComponent(ModalPostComponent);
    componentRef.instance;
    this.dialogService.toggleModal('modalPost');
  }

  // image or video url
  getImageUrl(item: any): string {
    if (item.PostMedia![0].cloudflare) {
      return item.PostMedia![0].cloudflare.result.variants[0];
    } else {
      return item.PostMedia![0].url;
    }
  }

  getVideoThumbnailUrl(item: any): string {
    if (this.subscriptionExpiredQuery(item)) {
      return item.PostMedia![0].cloudflare
        ? `https://customer-6kruyx7h361tmu11.cloudflarestream.com/${item.PostMedia![0].cloudflare.result.uid}/thumbnails/thumbnail.gif?time=1s&height=200&duration=10s`
        : item.PostMedia![0].urlSnapshot;
    } else {
      return item.PostMedia![0].cloudflare
        ? `https://customer-6kruyx7h361tmu11.cloudflarestream.com/${item.PostMedia![0].cloudflare.result.thumbnail}`
        : item.PostMedia![0].urlSnapshot;
    }
  }

  getVideoPlaceholderUrl(item: any): string {
    return item.PostMedia![0].cloudflare
      ? `https://customer-6kruyx7h361tmu11.cloudflarestream.com/${item.PostMedia![0].cloudflare.result.thumbnail}`
      : item.PostMedia![0].urlSnapshot;
  }

  onUpdateClick(id: string, clickType: string) {

    const data = {
      Post: id,
      clickType: clickType
    }
    //this.postAdService.updateClick(data).toPromise();
  }

  // likes
  onLikes(post: Post) {
    if (post && this.authService.user()!) {
      const data = {};

      // Encontrar el índice del objeto Post en la matriz
      const index = this.posts.findIndex((item: Post) => item._id === post._id);

      // Si se encuentra el objeto en la matriz, actualizar el dato
      if (index !== -1) {
        this.posts[index].likes! += 1;
      }

      this.postService.likes(post._id!, data).subscribe(res => {
        if (res) {

        }
      });
    }
  }

  // share
  share(post: Post) {
    if (navigator.share) {
      navigator.share({
        title: post.description !== null ? post.description : `I'm hot, fuck me 👉👌😋`,
        text: `I want to have sex with you, soft and hard 👉👌😋`,
        url: `https://${environment.domain}/pu/` + post.slug
      })
        .then(() => console.log('Content shared successfully'))
        .catch((error) => console.log('Error al share:', error));
    } else {
      console.log('The Web Share API is not available in this browser');
    }
  }

  // inner
  innerText(text: any) {
    return Tools.innerText(text);
  }

  // text
  textMessage(item: Post) {
    return `Hola, acabo de ver tu anuncio en ${environment.domain}, `
      + Tools.cropText(item.title!, 25) + '(...)' +
      ", quiero una cita contigo."
      + `https://${environment.domain}/pu/` + item.slug;
  }

  onLogin(): void {
    this.router.navigate(['/auth/login']);
  }

}
