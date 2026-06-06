import { Component, ComponentRef, computed, effect, EventEmitter, inject, Output, signal, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { TipService } from '../../services/tip.service';
import { UserCreditService } from '../../services/user-credit.service';
import { SpinnerService } from '../../services/spinner.service';
import { Router } from '@angular/router';
import { TransactionCreditService } from '../../services/transaction-credit.service';
import { NumericValidatorTip } from '../../core/common/custom-validators.ts';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '@services/dialog.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Money } from '@interfaces/money';
import { UserCredit } from '@interfaces/userCredit';
import { Tools } from '@core/common/tools';
import { Subject, takeUntil } from 'rxjs';
import { CreditPurchaseComponent } from '@shared/credit-purchase/credit-purchase.component';
import { SocketService } from '@services/socket.service';
import { UserService } from '@services/user.service';
import { SubscriptionService } from '@services/subscription.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { User } from '@interfaces/user';
import { environment } from '@environments/environment';
import { KissService } from '@services/kiss.service';
import { ChatService } from '@services/chat.service';
import { MessageService } from '@services/message.service';
import { v4 as uuidv4 } from 'uuid';
import { ToolsService } from '@services/tools.service';

interface Gift {
  id: number;
  name: string;
  image: string;
  price: number;
}

@Component({
  selector: 'app-tip',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    IconDirective
  ],
  providers: [],
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
  ],
  templateUrl: './tip.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tip.component.scss'
})
export class TipComponent {

  loading: boolean = false;
  myform: FormGroup;
  money: Money;
  userCredit: UserCredit | undefined;
  tip: any;
  chatId = signal(null);

  selectedGift: Gift | null = null;

  gifts: Gift[] = [
    { id: 1, name: 'rose', image: '🌹', price: 1 },
    { id: 2, name: 'coffee', image: '☕', price: 5 },
    { id: 3, name: 'wine', image: '🍷', price: 10 },
    { id: 4, name: 'heart', image: '💖', price: 20 },
    { id: 5, name: 'teddyBear', image: '🧸', price: 30 },
    { id: 6, name: 'perfume', image: '🍾', price: 40 },
    { id: 7, name: 'star', image: '🌟', price: 50 },
    { id: 8, name: 'chocolates', image: '🍫', price: 60 },
    { id: 9, name: 'fireworks', image: '🎆', price: 75 },
    { id: 10, name: 'rocket', image: '🚀', price: 100 },
    { id: 11, name: 'diamond', image: '💎', price: 150 },
    { id: 12, name: 'ring', image: '💍', price: 200 }
  ];

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private destroy$ = new Subject<void>();
  @Output() closeModal = new EventEmitter<void>();

  // components
  private creditPurchaseComponentRef: ComponentRef<CreditPurchaseComponent> | null = null;

  //sound
  audio: HTMLAudioElement | null = null;

  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  public dialogService = inject(DialogService);
  private transactionCreditService = inject(TransactionCreditService);
  public tipService = inject(TipService);
  private spinnerService = inject(SpinnerService);
  public router = inject(Router);
  public userCreditService = inject(UserCreditService);
  private socketService = inject(SocketService);
  private userService = inject(UserService);
  private subscriptionService = inject(SubscriptionService);
  private kissService = inject(KissService);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private toolsService = inject(ToolsService);

  constructor() {
    effect(() => {
      this.tip = this.tipService.tip();
    });
  }

  ngOnInit(): void {
    this.createFormControls();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // components
    this.clearCreditPurchaseComponent();
  }

  createFormControls() {
    this.myform = this.fb.group({
      amount: [5, [Validators.required, NumericValidatorTip]],
      message: ['', [Validators.nullValidator]]
    });
  }

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

  logout() {
    this.dialogService.closeModal();
    this.subscriptionService.resetSubscribersUserJoin();
    this.authService.logout();
  }

  // close
  onCloseModal() {
    this.closeModal.emit(); // Notifica al padre que el modal se cerró
  }

  selectGift(gift: Gift): void {
    // this.selectedGift = gift;
    const price = Number(gift.price);
    this.selectedGift = null;
    this.onSubmit(price);
  }

  sendGift() {
    if (this.selectedGift) {
      const price = Number(this.selectedGift.price);
      this.selectedGift = null;
      this.onSubmit(price);
    }
  }

  async onSubmit(price: number) {
    try {

      this.dialogService.closeModal();
      if (this.authService.user()) {

        if (Number(price) <= Number(this.userCreditService.userCredit()?.current)) {

          this.spinnerService.start();

          let data: any = {
            type: this.tip.type,
            creditAmount: Number(price),
            Receiver: this.tip.user,
          };

          if (this.tip.type === 'TIP_POST') {
            data.Post = this.tip.post._id;
          } else if (this.tip.type === 'TIP_LIVE') {
            data.LiveStreamId = this.tip.LiveStreamId
          }

          if (!data) {
            this.spinnerService.close();
            this.myform.patchValue({
              amount: Number(1),
            });
            return;
          }

          //sound
          if (this.tip.type !== 'TIP_LIVE') {
            this.playSound();
          }

          this.toastService.start({ type: 'success', message: 'tipWasSent' });
          this.myform.patchValue({
            amount: Number(5),
          });

          this.transactionCreditService.createTransfer(data)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (res) => {
                this.kissService.start(2500);
              },
              error: (err) => {
                this.spinnerService.close();
              },
              complete: () => {
                this.spinnerService.close();
              }
            });

        } else {
          //buy credit
          this.onCreditPurchase();
        }
      } else {
        this.onCreditPurchase();
      }
    } catch (error) {
      console.error(error);
    }
  }

  openCreditPurchase(): void {
    this.onCreditPurchase();
  }

  playSound() {
    if (!this.audio) {
      this.audio = new Audio('public/sounds/scale.mp3'); // Crea una nueva instancia si no existe
    }
    this.audio.play().catch((error) => {
      console.error('Error al reproducir el sonido:', error);
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

  //  input class
  inputClass(formGroup: FormGroup, controlName: string,) {
    return Tools.inputClass(formGroup, controlName);
  }

  buttonClass() {
    return Tools.buttonClass();
  }

  cardModalClass() {
    return Tools.cardModalClass();
  }

  modalClass() {
    return Tools.modalClass();
  }
}
