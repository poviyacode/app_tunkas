import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ApplicationRef, Component, ComponentRef, effect, HostListener, inject, Inject, OnInit, PLATFORM_ID, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { environment } from '@environments/environment';
import { User } from '@interfaces/user';
import { Post } from '@interfaces/post';
import { UserService } from '@services/user.service';
import { TranslateModule } from '@ngx-translate/core';
import { SearchService } from '@services/search.service';
import { first, Subject, takeUntil } from 'rxjs';
import { DialogService } from '@services/dialog.service';
import { TipService } from '@services/tip.service';
import { ToastService } from '@services/toast.service';
import { SpinnerService } from '@services/spinner.service';
import { TipComponent } from '@shared/tip/tip.component';
import { AuthService } from '@services/auth.service';
import { ChatService } from '@services/chat.service';
import { SocketService } from '@services/socket.service';
import { Tools } from '@core/common/tools';
import { MessageService } from '@services/message.service';
import { Title } from '@angular/platform-browser';
import { IconDirective } from '@directive/coin-svg.directive';
import { UserCreditService } from '@services/user-credit.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import { ToolsService } from '@services/tools.service';

@Component({
  selector: 'app-users-live',
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    IconDirective
  ],
  templateUrl: './users-live.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './users-live.component.scss'
})
export default class UsersLiveComponent {

  isBrowser: boolean;
  isServer: boolean;

  urlCurrent = 'users';
  search: string | null;

  totalPages: number = 0;
  currentPage = 0;
  limitPage = 9;
  hasMore: boolean = true;
  loading: boolean = false;

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private destroy$ = new Subject<void>();

  // components
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;

  public router = inject(Router);
  public userService = inject(UserService);
  private searchService = inject(SearchService);
  private toastService = inject(ToastService);
  private spinnerService = inject(SpinnerService);
  public authService = inject(AuthService);
  private chatService = inject(ChatService);
  private platformId = inject(PLATFORM_ID);
  private socketService = inject(SocketService);
  private applicationRef = inject(ApplicationRef);
  private messageService = inject(MessageService);
  private title = inject(Title);
  private userCreditService = inject(UserCreditService);
  private transactionCreditService = inject(TransactionCreditService);
  private dialogService = inject(DialogService);
  private toolsService = inject(ToolsService);

  constructor() {
    this.title.setTitle('Live');
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    if (this.isBrowser) {
      this.searchService.sharedData$.subscribe((search) => {

        if (search) {
          this.search = search === 'all' ? null : search;
          this.currentPage = 0;
          this.hasMore = true;
          this.findSearch();
        }

        if (!this.socketService.socket) {
          this.monitorAppStability();
        } else {
          this.socketUserUpdate();
        }
      });
    }

  }

  ngOnInit(): void {
    if (this.userService.usersLive().length === 0) {
      this.loading = true;
    }

    if (this.isBrowser) {
      this.loading = true;
      this.findSearch();
    }

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.authService.user()) {
      this.detachSocketEvents();
    }
  }

  monitorAppStability(): void {
    this.applicationRef.isStable.pipe(
      first(isStable => isStable)
    ).subscribe(() => {
      if (this.authService.user()!) {
        this.socketUserUpdate();
      }
    });
  }

  findSearch() {

    if (!this.hasMore) return;

    // this.loading = true;

    let data: any = {};

    if (this.search) {
      data.search = this.search;
    }

    this.userService.findUsersLive(data, this.limitPage, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {

          if (res && res.data.length > 0) {

            if (this.currentPage === 0) {
              this.userService.resetUsersLive();
              this.totalPages = Number(res.total);
            }

            const currentItems = this.userService.usersLive();
            const newPosts = res.data.filter((newPost: User) => {
              return !currentItems.some(existing => existing._id === newPost._id);
            });
            const updatedItems = [...currentItems, ...newPosts];
            this.userService.addUsersLive(updatedItems);

            this.hasMore = this.currentPage <= this.totalPages;

          } else {
            this.userService.resetUsersLive();
            this.hasMore = false;
          }
        },
        error: (err) => {
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
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

  getBackgroundImageUrl(item: User): string {
    if (item.liveCapture) {
      return item.liveCapture.result.variants[0];
    }
    return '';
  }

  isType(item: any, type: string): boolean {
    return item.Cover && item.Cover.length > 0 && item.Cover[0].type === type;
  }

  hasCover(item: any): boolean {
    return item.Cover && item.Cover.length > 0;
  }

  // create chat
  onChat(item: User) {

    if (this.authService.user()?._id) {

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
      this.router.navigate(['/auth/login']);
    }
  }

  // socket 
  socketUserUpdate() {
    if (!this.socketService.socket) {
      return;
    }

    this.socketService.socket.on(`live-capture-server`, (user: User) => {
      const poToUpdate = this.userService.usersLive().find((item) => item._id === user._id);
      if (poToUpdate) {
        poToUpdate.liveCapture = user.liveCapture;
        this.userService.updateUsersLive(user._id!, {
          ...poToUpdate
        });
      }
    });

    this.socketService.socket.on(`live-server`, (user: User) => {
      if (user.live && user.transmissionType === 'STREAMING') {
        const currentItems = this.userService.usersLive();
        const newPosts = [user].filter((newItem: User) => {
          return !currentItems.some(existing => existing._id === newItem._id);
        });
        const updatedItems = [...newPosts, ...currentItems];
        this.userService.addUsersLive(updatedItems);
      } else if (!user.live) {
        this.userService.removeUsersLive(user._id!);
      }
    });
  }

  detachSocketEvents() {

    if (!this.socketService.socket) {
      return;
    }

    this.socketService.socket.off('live-capture-server');
    this.socketService.socket.off('live-server');
  }

  // live
  onLiveStream(item: User) {
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
  }

  // live
  async onStartLiveStream() {

    const userCredit = this.userCreditService.userCredit()?.current || 0;
    const gender = this.authService.user()?.gender || 'MAN';

    // if (gender === 'MAN' && Number(userCredit) <= Number(0)) {
    //   this.onCreditPurchase();
    //   return;
    // }

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

  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // button class
  buttonClass() {
    return Tools.buttonClass();
  }
}
