
import { Component, ComponentFactoryResolver, effect, ElementRef, HostListener, inject, OnInit, PLATFORM_ID, QueryList, ViewChild, ViewChildren, ViewContainerRef, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, Meta, SafeResourceUrl, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Post } from '@interfaces/post';
import { PostMedia } from '@interfaces/postMedia';
import { Subscription } from '@interfaces/subscription';
import { User } from '@interfaces/user';
import { ModalPostComponent } from '@layout/post/pages/modal-post/modal-post.component';
import { ToastService } from '@services/toast.service';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { DialogService } from '@services/dialog.service';
import { PostMediaService } from '@services/post-media.service';
import { PostService } from '@services/post.service';
import { SubscriptionService } from '@services/subscription.service';
import { UserService } from '@services/user.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-media-profile',
    imports: [
    RouterLink,
    RouterLinkActive,
    TranslateModule
],
    templateUrl: './media-profile.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './media-profile.component.scss'
})
export default class MediaProfileComponent implements OnInit {

  typeMedia: string | null;

  dataStory: any;

  loading = false;
  @ViewChildren('theLastList', { read: ElementRef }) theLastList: QueryList<ElementRef>;
  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;

  showButton = false;
  scrollHeight = 400;

  date: any;
  isBrowser: boolean;
  isServer: boolean;
  searchText = 'search';
  dataSearch: any;

  data: any;
  dataTip: any;
  postName: any;
  postMedias: PostMedia[] = [];

  totalPages: number = 0;
  currentPage = 0;
  limitPage = 6;
  hasMore: boolean = true;

  swCityZones = true;

  bodyText: string;
  public safeURL: SafeResourceUrl;

  postLoading: string[] = ["hola", "que", "tal", "hola", "que", "tal"];

  subscription?: Subscription | null;
  private destroy$ = new Subject<void>();

  count: any;
  slug: string;
  user: User;

  public router = inject(Router);
  public postService = inject(PostService);
  public postMediaService = inject(PostMediaService);
  private sanitizer = inject(DomSanitizer);
  private dialogService = inject(DialogService);
  public authService = inject(AuthService);
  public subscriptionService = inject(SubscriptionService);
  public userService = inject(UserService);

  constructor() {
    this.safeURL = this.sanitizer.bypassSecurityTrustResourceUrl('https://player.vimeo.com/video/767046013?h=edafcd7ab5');
    this.date = new Date();
    this.slug = this.router.url.split('/')[1];
    this.typeMedia = this.router.url.split('/')[2];

    effect(() => {
      this.count = this.postService.countPostsProfile();
    });
  }

  ngOnInit(): void {
    if (this.typeMedia == 'media' || this.typeMedia == 'photos' || this.typeMedia == 'videos') {
      this.postMediaService.resetPostMedias();
      this.findAllMedia();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {

  }

  // find
  async findAllMedia() {

    if (!this.userService.userProfile() || this.loading || !this.hasMore) return;
    this.loading = true;

    this.data = {
      User: this.userService.userProfile()!._id,
    }

    if (this.typeMedia == 'photos' || this.typeMedia == 'videos') {
      this.data.type = this.typeMedia === 'photos' ? 'image' : this.typeMedia === 'videos' ? 'video' : '';
    }

    this.postService.findAllUserMedia(this.data, this.limitPage, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {

          if (res && res.data.length > 0) {

            if (this.currentPage === 0) {
              this.totalPages = res.total;
            }

            const currents = this.postMediaService.postMedias();
            const newItems = res.data.filter((newPost: Post) => {
              return !currents.some(existing => existing._id === newPost._id);
            });
            const updatedItems = [...currents, ...newItems];
            this.postMediaService.addPostMedias(updatedItems);

            this.hasMore = this.currentPage <= this.totalPages;

          } else {
            this.hasMore = false;
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al cargar los posts:', err);
          this.loading = false;
        }
      });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
      if (this.hasMore && !this.loading) {
        this.currentPage = this.currentPage + this.limitPage;
        this.findAllMedia();
      }
    }
  }

  // subscription post
  subscriptionExpiredQuery(item: Post): boolean {

    if (item.typeView == 'FREE') {
      return false;
    }

    if (this.authService.user()!) {
      this.subscription = this.subscriptionService.searchSubscribersUserJoin(item.User?.username!);
    }

    if (this.authService.user()!) {
      if (this.authService.user()!._id !== item.User?._id) {
        if (this.subscription && this.subscription.expired) {
          //console.log(true);
          return true;
        } else if (!this.subscription && (item.typeView == 'SUBSCRIBERS' || item.typeView == 'PAYMENT')) {
          //console.log('not subscribed');
          return true;
        } else {
          //console.log('not expired');
          //console.log(false);
          return false;
        }
      } else {
        //console.log(false);
        return false;
      }
    } else if (item.typeView == 'SUBSCRIBERS' || item.typeView == 'PAYMENT') {
      return true;
    } else {
      return false;
    }

  }

  // modal

  
  onModalPost(item: PostMedia, currentIndex: number) {

    const post = {
      User: item.User,
      PostMedia: this.postMediaService.postMedias(),
      currentIndex: Number(currentIndex),
    };
    
    this.postService.addPost(post);
    this.viewContainerRef.clear();
    const componentRef = this.viewContainerRef.createComponent(ModalPostComponent);
    componentRef.instance;
    this.dialogService.toggleModal('modalPost');
  }

}
