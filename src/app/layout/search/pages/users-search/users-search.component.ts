import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Component, ComponentRef, effect, HostListener, inject, Inject, OnInit, PLATFORM_ID, signal, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { environment } from '@environments/environment';
import { User } from '@interfaces/user';
import { Post } from '@interfaces/post';
import { UserService } from '@services/user.service';
import { TranslateModule } from '@ngx-translate/core';
import { SearchService } from '@services/search.service';
import { Subject, takeUntil } from 'rxjs';
import { Subscription } from '@interfaces/subscription';
import { DialogService } from '@services/dialog.service';
import { TipService } from '@services/tip.service';
import { ToastService } from '@services/toast.service';
import { SpinnerService } from '@services/spinner.service';
import { TipComponent } from '@shared/tip/tip.component';
import { AuthService } from '@services/auth.service';
import { ChatService } from '@services/chat.service';
import { MessageService } from '@services/message.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { PostMediaService } from '@services/post-media.service';
import { PostMediaDetails } from '@interfaces/postMedia';
import { Tools } from '@core/common/tools';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-users-search',
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    IconDirective
  ],
  templateUrl: './users-search.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./users-search.component.scss']
})
export default class UsersSearchComponent {

  urlCurrent = 'users';
  search: string | null;

  totalPages: number = 0;
  currentPage = 0;
  limitPage = 6;
  hasMore: boolean = true;

  loading = signal(false);
  posts: Post[] = [];

  postLoading: string[] = ["hola", "hola", "hola", "hola"];
  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private destroy$ = new Subject<void>();

  // components
  private tipComponentRef: ComponentRef<TipComponent> | null = null;

  public router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  public userService = inject(UserService);
  private searchService = inject(SearchService);
  private dialogService = inject(DialogService);
  private tipService = inject(TipService);
  private toastService = inject(ToastService);
  private spinnerService = inject(SpinnerService);
  public authService = inject(AuthService);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private postMediaService = inject(PostMediaService);

  constructor() {

    this.searchService.sharedData$.subscribe((search) => {
      if (search === 'all') {
        this.userService.resetUsers();
        this.search = null;
      } else {
        this.userService.resetUsers();
        this.search = search;
      }

      this.limitPage = 6;
      this.currentPage = 0;
      this.hasMore = true;

      this.findSearch();
    });
  }

  ngOnInit(): void {

    if (this.userService.users().length === 0) {
      //this.findSearch();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  findSearch() {

    if (!this.hasMore) return;

    this.loading.set(true);

    let data: any = {};

    if (this.search) {
      data.search = this.search;
    }

    this.userService.searchUsers(data, this.limitPage, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && res.data.length > 0) {

            if (this.currentPage === 0) {
              this.totalPages = Number(res.total);
            }

            const currentItems = this.userService.users();
            const newPosts = res.data.filter((newPost: User) => {
              return !currentItems.some(existing => existing._id === newPost._id);
            });
            const updatedItems = [...currentItems, ...newPosts];
            this.userService.addUsers(updatedItems);

            this.hasMore = this.currentPage <= this.totalPages;

          } else {
            this.hasMore = false;
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
        },
        complete: () => {
          console.log('Request completed');
        }
      });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
      if (this.hasMore && !this.loading) {
        this.currentPage = this.currentPage + this.limitPage;
        this.findSearch();
      }
    }
  }

  onSearch($event: any) {
    this.search = $event.q;
    this.findSearch();
  }

  getMediaDetails(media: any): PostMediaDetails | null {
    return this.postMediaService.getBackgroundImageUrl(media);
  }

  hasCover(item: any): boolean {
    return item.Cover && item.Cover.length > 0;
  }

  // tip
  onTip(user: User) {
    const dataTip = {
      type: 'TIP_ACCOUNT',
      user: user
    };
    this.tipService.addTip(dataTip);

    this.onTipModal();
  }

  // create chat
  async onChat(Receiver: User) {
    const data: { Sender: User, Receiver: User } = {
      Sender: this.authService.user()!,
      Receiver: Receiver
    }
    await this.chatService.startChatWithProfile(data);
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

  // input class
  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  textareaClass(formGroup: FormGroup, controlName: string, height: string) {
    return Tools.textareaClass(formGroup, controlName, height);
  }

  cardClass() {
    return Tools.cardClass();
  }

  buttonClass() {
    return Tools.buttonClass();
  }

  buttonSecondaryClass() {
    return Tools.buttonSecondaryClass();
  }

  cardModalClass() {
    return Tools.cardModalClass();
  }

}
