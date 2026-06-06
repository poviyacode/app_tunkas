import { AfterViewInit, Component, computed, effect, ElementRef, HostListener, inject, Inject, OnInit, PLATFORM_ID, QueryList, signal, Signal, ViewChild, ViewChildren, ViewContainerRef, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { PostService } from '@services/post.service';
import { AuthService } from '@services/auth.service';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';;
import { SubscriptionService } from '@services/subscription.service';
import { SpinnerService } from '@services/spinner.service';
import { environment } from '@environments/environment';
import { CounterService } from '@services/counter.service';
import { TipService } from '@services/tip.service';
import { SugestionsComponent } from '@shared/sugestions/sugestions.component';
import { DialogService } from '@services/dialog.service';
import { CommentsPostComponent } from '@layout/post/pages/comments-post/comments-post.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Tools } from '@core/common/tools';
import { ReadMoreComponent } from '@library/read-more/read-more.component';
import { Post } from '@interfaces/post';
import { Subscription } from '@interfaces/subscription';
import { TipComponent } from '@shared/tip/tip.component';
import { ModalPostComponent } from '@layout/post/pages/modal-post/modal-post.component';
import { DropdownPostComponent } from '@layout/post/pages/dropdown-post/dropdown-post.component';
import { lastValueFrom, Subject, takeUntil } from 'rxjs';
import { SearchOuterComponent } from '@layout/search/search-outer/search-outer.component';
import { SeoService } from '@services/seo.service';
import { MetaTag } from '@interfaces/metaTags';
import { ToastService } from '@services/toast.service';
import { ToolsService } from '@services/tools.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { DateAgoPipe } from '@pipes/date-ago.pipe';

@Component({
  selector: 'app-list-tags',
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    DateAgoPipe,
    IconDirective,
  ],
  templateUrl: './list-tags.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./list-tags.component.scss']
})
export default class ListTagsComponent {

  isBrowser: boolean;
  isServer: boolean;

  @ViewChildren('theLastList', { read: ElementRef }) theLastList: QueryList<ElementRef>;
  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;

  showButton = false;
  scrollHeight = 400;

  loading = signal(false);

  posts: Post[] = [];
  post: Post;

  tag: string | null;

  currentPage = 0;
  limitPage = 8;
  totalPages = 0;
  hasMore: boolean = true;

  dataSearch: any;
  isFirstElement = true;
  isPost: boolean;

  subscription: Subscription | null;
  subscribersJoin: Subscription[] = [];

  private destroy$ = new Subject<void>();

  postLoading: string[] = ["hola", "que", "tal", "hola", "que", "tal", "hola", "que"];

  private translateService = inject(TranslateService);
  public postService = inject(PostService);
  public authService = inject(AuthService);
  public router = inject(Router);
  private document = inject(DOCUMENT);
  public dialogService = inject(DialogService);
  private subscriptionService = inject(SubscriptionService);
  private platformId = inject(PLATFORM_ID);
  public counterService = inject(CounterService);
  public tipService = inject(TipService);
  private seoService = inject(SeoService);
  private toastService = inject(ToastService);
  private activatedRoute = inject(ActivatedRoute);
  private title = inject(Title);
  private toolsService = inject(ToolsService);

  constructor() {

    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    this.activatedRoute.paramMap.subscribe((params) => {
      this.tag = params.get('tag');
      this.title.setTitle(this.tag!);
    });

  }

  ngOnInit(): void {
    this.postService.resetPosts();
    this.findAllPosts();
    this.headPage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit() {

  }

  // find
  findAllPosts() {
    if (!this.hasMore) return;

    this.loading.set(true);
    const data: any = {};

    if (this.tag) {
      data.search = this.tag;
    }

    if (this.authService.user()) {
      data.User = this.authService.user()?._id;
    }

    const urlSegment = 'FREE';

    if (urlSegment) {
      data.typeView = urlSegment.toUpperCase();
    }

    this.postService.findAllSearchPosts(data, this.limitPage, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && res.data.length > 0) {

            if (this.currentPage === 0) {
              this.totalPages = res.total;
            }

            const currentPosts = this.postService.posts();
            const newPosts = res.data.filter((newPost: Post) => {
              return !currentPosts.some(existingPost => existingPost._id === newPost._id);
            });
            const updatedPosts = [...currentPosts, ...newPosts];
            this.postService.addPosts(updatedPosts);
            this.posts = this.postService.posts();
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
        this.findAllPosts();
      }
    }
  }

  // seo
  headPage() {
    const data: MetaTag = {
      title: `Explore content tagged "${this.tag}"`,
      description: `Find the best content under the "${this.tag}" tag. Dive into a wide range of posts and engage with creators who are passionate about "${this.tag}".`,
      path: `tags/${this.tag}`,
      image: `https://${environment.domain}/public/logo/dating.jpg`
    };
    this.seoService.updateMetaTags(data);
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

  onPost(post: Post) {
    this.postService.resetPost();
    const data: Post = {
      ...post,
      route: `tags/${this.tag}`,
    };
    this.postService.addPost(data);
    this.router.navigate(['tags', this.tag, 'pu', post.slug]);

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
    if (this.verifiedPrivate(item)) {
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

  // share
  shareTag() {
    if (navigator.share) {
      navigator.share({
        title: this.tag!,
        text: `I want to have sex with you, soft and hard 👉👌😋`,
        url: `https://${environment.domain}/tags/${this.tag}`
      })
        .then(() => console.log('Content shared successfully'))
        .catch((error) => console.log('Error al share:', error));
    } else {
      console.log('The Web Share API is not available in this browser');
    }
  }

  // scroll
  onScrollTop(): void {
    this.document.documentElement.scrollTop = 0;
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


  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }
}
