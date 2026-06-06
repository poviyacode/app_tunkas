import { Component, EventEmitter, inject, Output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { SpinnerService } from '../../services/spinner.service';
import { PaymentOrderService } from '../../services/payment-order.service';
import { buyCredit } from '../../core/common/custom-validators.ts';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { DynamicComponentService } from '../../services/dinamic-component.service';
import { DialogService } from '../../services/dialog.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Tools } from '@core/common/tools';
import { ProductCreditService } from '@services/product-credit.service';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from '@services/toast.service';
import { ToolsService } from '@services/tools.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { ProductCredit } from '@interfaces/productCredit';
import { Router } from '@angular/router';
import { Money } from '@interfaces/money';
import { UserService } from '@services/user.service';
import { UserCreditService } from '@services/user-credit.service';

@Component({
  selector: 'app-credit-purchase',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    IconDirective
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
  ],
  templateUrl: './credit-purchase.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './credit-purchase.component.scss'
})
export class CreditPurchaseComponent {

  myform: FormGroup;
  bonus = signal<number>(0);
  totalPrice = signal<number>(0);
  money = signal<Money | null>(null);

  @Output() closeModal = new EventEmitter<void>();
  private destroy$ = new Subject<void>();

  public dialogService = inject(DialogService);
  private authService = inject(AuthService);
  private spinnerService = inject(SpinnerService);
  private paymentOrderService = inject(PaymentOrderService);
  public productCreditService = inject(ProductCreditService);
  public toastService = inject(ToastService);
  public toolsService = inject(ToolsService);
  public transactionCreditService = inject(TransactionCreditService);
  public router = inject(Router);
  public userService = inject(UserService);
  public userCreditService = inject(UserCreditService);

  ngOnInit(): void {
    this.findAll();
    this.userCredit();
    this.createFormControls();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createFormControls() {
    this.myform = new FormGroup({
      selectCredit: new FormControl('', [Validators.required,]),
      credit: new FormControl({ value: 10, disabled: true }, [Validators.required, buyCredit]),
    });

    this.myform.get('selectCredit')!.valueChanges.subscribe(value => {
      if (value === 'custom') {
        this.myform.get('credit')!.enable();
      } else {
        this.myform.get('credit')!.reset(10);
        this.myform.get('credit')!.disable();
        this.updateTotalPrice(value);
      }
    });

    this.myform.get('credit')!.valueChanges.subscribe(value => {

      if (this.myform.get('selectCredit')!.value === 'custom' && value) {
        const quantityCoin = Number(value);
        const selectedCredit = this.getCoinObject(this.productCreditService.productCredits(), quantityCoin)
        const bonus = selectedCredit?.bonus || 0;
        this.bonus.set(bonus);
        const price = this.calculatePrice(quantityCoin, bonus);
        this.updateTotalPrice(price);
      }

      if (Number(value) < 10 || Number(value) > 500) {
        this.totalPrice.set(10);
      } else {

      }
    });
  }

  updateTotalPrice(creditValue: any) {
    const selectedCredit = this.productCreditService.productCredits()!.find(item => item.credit == creditValue);
    if (selectedCredit) {
      const price = this.calculatePrice(creditValue, selectedCredit.bonus!);
      this.totalPrice.set(price!);
    } else {
      this.totalPrice.set(creditValue);
    }
  }

  // calculate price
  calculatePrice(quantityCoin: number, bonus: number) {
    const priceCoin = Number(this.transactionCreditService.creditCalculator()?.priceCoin);
    const price = Number((quantityCoin * priceCoin - priceCoin * bonus).toFixed(2));
    return price;
  }

  getCoinObject(coinList: ProductCredit[], inputCoins: number) {
    const sortedList = [...coinList].sort((a, b) => a.credit! - b.credit!);
    for (let i = sortedList.length - 1; i >= 0; i--) {
      if (inputCoins >= sortedList[i].credit!) {
        return sortedList[i];
      }
    }

    return null;
  }

  // find 
  findAll() {
    this.productCreditService.findAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.productCreditService.resetProductCredits();
          const currentPostsUser = this.productCreditService.productCredits();
          const updatedPostsUser = [...currentPostsUser, ...res.list];
          this.productCreditService.addProductCredits(updatedPostsUser);

          this.transactionCreditService.addCreditCalculator(res.creditCalculator);

          if (res.list.length > 0) {
            this.money.set(res.list[0].Money!);
          }
        },
        error: (err) => {
        },
        complete: () => {
          console.log('Request completed');
        }
      });
  }

  userCredit() {
    const localUser = this.authService.user();
    if (!localUser) return;
    this.userService.findOneCurrent(localUser._id!)
      .then(updatedUser => {
        const { User, UserCredit, CreditCalculator } = updatedUser;
        if (User) {
          // Actualizamos el Signal en memoria con los datos frescos
          this.authService.addUser(User);
          this.userCreditService.addUserCredit(UserCredit!);
          //this.transactionCreditService.addCreditCalculator(CreditCalculator!);
          // Si descubrimos en segundo plano que lo suspendieron, lo sacamos en ese instante
          if (User.status === 'SUSPENDED' || User.status === 'DELETED') {
            this.router.navigateByUrl(`/${User.username}`);
            this.authService.logout();
          }
        }
      })
      .catch(error => {
        // Si el token cayó o fue eliminado en el servidor, lo deslogueamos en diferido
        console.error('Error verificando estado de usuario:', error);
        if (error.status === 401 || error.status === 403) {
          this.router.navigateByUrl('/auth');
        }
      });

    // Retornamos true INMEDIATAMENTE. El usuario no sentirá retrasos al cambiar de página.
    return true;
  }

  // register
  onSubmit(): void {

    const user = this.authService.user()!;
    if (user.status === 'SUSPENDED') {
      this.onCloseModal();
      const route = `/${user.username}`;
      this.router.navigateByUrl(`${route}`).then(() => {
        //window.location.reload();
      });
      return;
    }

    if (this.myform.valid && this.authService.user()!) {
      this.spinnerService.start();

      const data = {
        amount: Number(this.totalPrice()),
        currency: this.money()?.iso,
        paymentType: 'SALE_CREDIT',
        paymentDetails: {
          transaction: 'sale_credit',
          credit: Number(this.myform.value.selectCredit === 'custom' ? this.myform.value.credit : this.myform.value.selectCredit),
        }
      }

      this.onCloseModal();

      this.paymentOrderService.createPaymentOrder(data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res) {
              let url = `${res.paymentDetails?.urlCheckout}/${res.codeCollection}`;
              window.open(`${url}`, "_parent", "noopener,noreferrer");

              this.spinnerService.close();
            }
          },
          error: (err) => {
            this.spinnerService.close();
            this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
          },
          complete: () => {
            console.log('Request completed');
          }
        })
    }
  }

  // close
  onCloseModal() {
    this.closeModal.emit(); // Notifica al padre que el modal se cerró
  }

  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  // button class
  buttonClass() {
    return Tools.buttonClass();
  }

  cardModalClass() {
    return Tools.cardModalClass();
  }

  buttonSecondaryClass() {
    return Tools.buttonSecondaryClass();
  }

  modalClass() {
    return Tools.modalClass();
  }
}
