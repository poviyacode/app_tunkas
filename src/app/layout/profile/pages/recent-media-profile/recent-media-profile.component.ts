import { Component, EventEmitter, inject, input, Output, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { environment } from '@environments/environment';
import { Post } from '@interfaces/post';
import { PostMedia } from '@interfaces/postMedia';
import { Subscription } from '@interfaces/subscription';
import { User } from '@interfaces/user';
import { ModalPostComponent } from '@layout/post/pages/modal-post/modal-post.component';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { DialogService } from '@services/dialog.service';
import { PostService } from '@services/post.service';
import { SubscriptionService } from '@services/subscription.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-recent-media-profile',
    imports: [
        TranslateModule
    ],
    templateUrl: './recent-media-profile.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './recent-media-profile.component.scss'
})
export class RecentMediaProfileComponent {

  @Output() openPostEvent = new EventEmitter<string>();

  user = input<User>();
  subscription: Subscription | null;

  loadingRecentMedia: boolean = false;
  currentPage = 0;

  recentPostMedias: PostMedia[] = [];
  postLoadingRecentMedia: string[] = ["hola", "que", "tal", "hola", "que", "tal", "hola", "que", "tal", "hola", "que", "tal"];

  private destroy$ = new Subject<void>();

  postService = inject(PostService);
  dialogService = inject(DialogService);
  authService = inject(AuthService);
  subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    this.findMediaRecent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async findMediaRecent() {

    this.recentPostMedias = [];
    this.loadingRecentMedia = true;

    const data = {
      'User': this.user()!._id,
      'Site': environment.site,
    }

    this.postService.findRecentUserMedia(data, 12, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.recentPostMedias = [];
            res.data.forEach((element: any) => {
              this.recentPostMedias.push(element);
            });
            this.loadingRecentMedia = false;
          }
        },
        error: (err) => {
          this.loadingRecentMedia = false;
        },
        complete: () => {
          console.log('Request completed');
        }
      });
  }

  onModalPost(item: PostMedia, currentIndex: number) {

    const post: any = {
      User: item.User,
      PostMedia: this.recentPostMedias,
      currentIndex: currentIndex,
    };

    this.openPostEvent.emit(post);
  }

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

}
