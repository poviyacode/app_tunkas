import { CommonModule, isPlatformBrowser, isPlatformServer, Location } from '@angular/common';
import { AfterViewInit, Component, ComponentRef, ElementRef, EventEmitter, HostListener, inject, Inject, Input, OnInit, Output, PLATFORM_ID, QueryList, signal, ViewChild, ViewChildren, ViewContainerRef, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Tools } from '@core/common/tools';
import { Post } from '@interfaces/post';
import { TransactionCredit } from '@interfaces/transactionCredit';
import { SpinnerService } from '@services/spinner.service';
import { TranslateModule } from '@ngx-translate/core';
import { DialogService } from '@services/dialog.service';
import { PostService } from '@services/post.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { Subject } from 'rxjs';
import WithdrawalMoneyActivityComponent from '../withdrawal-money-activity/withdrawal-money-activity.component';
import { DomSanitizer, SafeResourceUrl, Title } from '@angular/platform-browser';
import { AuthService } from '@services/auth.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { TruncatePipe } from '@pipes/truncate.pipe';
import { DateAgoPipe } from '@pipes/date-ago.pipe';
import { UserService } from '@services/user.service';
import { UserCreditService } from '@services/user-credit.service';
import { SubscriptionService } from '@services/subscription.service';
import CodeVerificationComponent from '@shared/code-verification/code-verification.component';
import { TokenService } from '@services/token.service';
import { ToastService } from '@services/toast.service';
import { ToolsService } from '@services/tools.service';

@Component({
  selector: 'app-list-activity',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    FormsModule,
    IconDirective,
    TruncatePipe,
    DateAgoPipe,
  ],
  templateUrl: './list-activity.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './list-activity.component.scss'
})
export default class ListActivityComponent {

  isBrowser: boolean;
  isServer: boolean;

  @ViewChildren('theLastList', { read: ElementRef }) theLastList: QueryList<ElementRef>;
  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private destroy$ = new Subject<void>();

  //  component
  private codeVerificationComponentRef: ComponentRef<CodeVerificationComponent> | null = null;

  showButton = false;
  scrollHeight = 500;

  isProfitVisible: boolean = true;
  hasMore = true;
  loading = signal(false);
  totalPages = 0;
  currentPage = 0;
  limitPage = 20;

  search: any;
  status: string;
  type: string;

  myFormSearch: FormGroup;

  bodyText: string;
  postLoading: string[] = ["hola", "que", "tal"];
  url: string;

  profit: number = 0;

  private postService = inject(PostService);
  private fb = inject(FormBuilder);
  public router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT)
  private spinnerService = inject(SpinnerService);
  public transactionCreditService = inject(TransactionCreditService);
  private activatedRoute = inject(ActivatedRoute);
  public dialogService = inject(DialogService);
  public authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  public title = inject(Title);
  private userService = inject(UserService);
  public userCreditService = inject(UserCreditService);
  private subscriptionService = inject(SubscriptionService);
  private tokenService = inject(TokenService);
  private toastService = inject(ToastService);
  private toolsService = inject(ToolsService);

  constructor() {

    this.title.setTitle('Activity');

    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    this.search = this.activatedRoute.snapshot.queryParamMap.get('search');

    this.activatedRoute.paramMap.subscribe((params) => {
      this.url = params.get('status') || 'active';
      this.hasMore = true;
      this.currentPage = 0;

    });

    if (this.isBrowser) {
      this.transactionCreditService.resetBalanceTransactionCredit();
      this.transactionCreditService.resetTransactionCredits();
      this.findAllUser();
    }

  }

  ngOnInit(): void {
    this.createFormControls();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit() {

  }

  createFormControls() {
    this.myFormSearch = new FormGroup({
      q: new FormControl(null, Validators.nullValidator),
      status: new FormControl('', Validators.nullValidator),
      type: new FormControl('', Validators.nullValidator),
      transaction: new FormControl(null, Validators.nullValidator)
    });
  }

  findAllUser() {

    if (!this.hasMore) return;
    this.loading.set(true);

    const data: any = {};

    if (this.status) {
      data.status = this.status;
    }

    if (this.type) {
      data.type = this.type;
    }

    if (this.search) {
      data.search = this.search;
    }

    this.transactionCreditService.findActivityTransactionUser(data, this.limitPage, this.currentPage).subscribe({
      next: (res) => {
        if (res && res.data.length > 0) {

          if (this.currentPage === 0) {
            this.transactionCreditService.addBalanceTransactionCredit(res.accountBalance);
            this.totalPages = Number(res.total);
          }

          const currents = this.transactionCreditService.transactionCredits();
          const news = res.data.filter((newItem: TransactionCredit) => {
            return !currents.some(existingPost => existingPost._id === newItem._id);
          });
          const updateds = [...currents, ...news];
          this.transactionCreditService.addTransactionCredits(updateds);

          this.hasMore = this.currentPage <= this.totalPages;

        } else {
          this.hasMore = false;
        }
      },
      error: (err) => {
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
      if (this.hasMore && !this.loading()) {
        this.currentPage = this.currentPage + this.limitPage;
        this.findAllUser();
      }
    }
  }

  // search
  onSubmitSearch(): void {

    this.router.navigate(['admin/activity'],
      {
        queryParams: {
          search: this.myFormSearch.value.q,
          status: this.myFormSearch.value.status,
          type: this.myFormSearch.value.type,
        }
      });

    this.status = this.myFormSearch.value.status;
    this.type = this.myFormSearch.value.type;
    this.search = this.myFormSearch.value.q;

    this.limitPage = 20;
    this.currentPage = 0;
    this.hasMore = true;
    this.transactionCreditService.resetTransactionCredits();
    this.findAllUser();
  }

  onWithdrawalMoney(): void {

    if (!this.authService.user()?.emailVerified) {
      this.onConfirmEmail();
      return;
    }

    if (this.transactionCreditService.balanceTransactionCredit()?.availableMoney! > 0) {
      this.viewContainerRef.clear();
      const componentRef = this.viewContainerRef.createComponent(WithdrawalMoneyActivityComponent);
      componentRef.instance;
      this.dialogService.toggleModal('withdrawalMoney');
    }

  }

  // scroll
  onScrollTop(): void {
    this.document.documentElement.scrollTop = 0;
  }

  // toogle published
  togglePublished(transactionCredit: Post) {

    if (transactionCredit.publishedCount! > 0) {
      const data = {
        published: !transactionCredit.published
      }
      transactionCredit.published = !transactionCredit.published;
    }
  }

  toggleProfitVisibility() {
    this.isProfitVisible = !this.isProfitVisible;
  }

  // select row index table
  selectedRowIndex: number | null = null;

  onRowClick(index: number): void {
    if (this.selectedRowIndex === index) {
      //this.selectedRowIndex = null; // Deselect if clicked again
    } else {
      this.selectedRowIndex = index;
    }
  }

  logout() {
    this.dialogService.closeModal();
    this.subscriptionService.resetSubscribersUserJoin();
    this.authService.logout();
  }
  // verify email
  async onConfirmEmail() {

    this.spinnerService.start();
    const data: any = {
      category: "VERIFY_EMAIL",
      type: "EMAIL",
      email: this.authService.user()?.email
    }

    const res = await this.tokenService.create(data);
    if (res && res.token) {
      this.tokenService.addToken(res.token);
      this.onCodeVedrificationModal();
    } else {
      this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
    }
    this.spinnerService.close();
  }
  //modal external
  onCodeVedrificationModal() {

    this.clearCodeVerificationComponent();

    const componentRef = this.viewContainerRef.createComponent(CodeVerificationComponent);

    this.codeVerificationComponentRef = componentRef;

    componentRef.instance.closeModal.subscribe(() => {
      console.log('The modal is closed from the child');
      this.clearCodeVerificationComponent();
      this.dialogService.closeModal();
    });

    this.dialogService.toggleModal('codeVerification');
  }

  private clearCodeVerificationComponent() {
    if (this.codeVerificationComponentRef) {
      this.codeVerificationComponentRef.destroy();
      this.codeVerificationComponentRef = null;
    }
  }

  getFirstLetter(name: string): string {
    return this.toolsService.getFirstLetter(name);
  }

  // input class
  selectClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  textareaClass(formGroup: FormGroup, controlName: string, height: string) {
    return Tools.textareaClass(formGroup, controlName, height);
  }
}
