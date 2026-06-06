import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NumeriDiscount, priceCreditDownload, pricePrimary } from '@core/common/custom-validators.ts';
import { Tools } from '@core/common/tools';
import { IconDirective } from '@directive/coin-svg.directive';
import { Membership } from '@interfaces/membership';
import { MoneyConvert } from '@interfaces/moneyConvert';
import { CreditValueBuy } from '@interfaces/userCredit';
import { TranslateModule } from '@ngx-translate/core';
import { NumberMoneyPipe } from '@pipes/number-money.pipe';
import { AuthService } from '@services/auth.service';
import { DialogService } from '@services/dialog.service';
import { MembershipService } from '@services/membership.service';
import { ProductCreditService } from '@services/product-credit.service';
import { SpinnerService } from '@services/spinner.service';
import { ToastService } from '@services/toast.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { UserCreditService } from '@services/user-credit.service';
import { UserService } from '@services/user.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-membership-setting',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    IconDirective,
    NumberMoneyPipe
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
  templateUrl: './membership-setting.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './membership-setting.component.scss'
})
export default class MembershipSettingComponent {

  loading = signal(false);

  myFormOne: any;
  myFormBunbles: FormGroup;
  myFormDownload: FormGroup;

  totalPrice = signal<number>(0);
  priceCoinUnity = signal<number>(0);
  creatorUtilityAmount = signal<number>(0);

  membershipId = signal<string>('');

  months = [
    { id: 1, label: '1 month' },
    { id: 3, label: '3 months' },
    { id: 6, label: '6 months' },
    //{ id: 12, label: '12 months' }
  ];

  private destroy$ = new Subject<void>();

  private authService = inject(AuthService);
  private userService = inject(UserService);
  public membershipService = inject(MembershipService);
  public dialogService = inject(DialogService);
  public userCreditService = inject(UserCreditService);
  public productCreditService = inject(ProductCreditService);
  public transactionCreditService = inject(TransactionCreditService);
  private toastService = inject(ToastService);
  private spinnerService = inject(SpinnerService);

  ngOnInit(): void {
    this.createFormControls();
    this.creatorUtilityAmount.set(this.transactionCreditService.creditCalculator()?.utility?.creatorUtilityAmount || 0);
    this.findAllUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createFormControls() {
    this.myFormOne = new FormGroup({
      credit: new FormControl(0, [Validators.required, pricePrimary]),
    });

    this.myFormBunbles = new FormGroup({
      credit: new FormControl(10, [Validators.required, pricePrimary]),
      quantyTime: new FormControl(1, Validators.required),
      discount: new FormControl(0, [Validators.required, NumeriDiscount]),
    });

    this.myFormOne.get('credit')!.valueChanges.subscribe((value: number) => {
    });

    this.myFormDownload = new FormGroup({
      creditAmountDownload: new FormControl(this.authService.user()?.creditAmountDownload || 0, [Validators.required, priceCreditDownload]),
    });

  }

  priceCreditSubscription(value: number, discount: number = 0) {

    if (value < 10) return 0;

    const quantityCoin = Number(value - discount);
    const priceCoin = Number(this.creatorUtilityAmount());
    const priceTotal = Number(quantityCoin * priceCoin);
    return Number(priceTotal);
  }

  priceCreditDownload(value: number) {

    if (value < 5) return 0;

    const quantityCoin = Number(value);
    const priceCoin = Number(this.creatorUtilityAmount());
    const priceTotal = Number(quantityCoin * priceCoin);
    return Number(priceTotal);
  }

  //  find all
  findAllUser(): void {

    this.loading.set(true);

    this.membershipService.resetMemberships();
    if (this.authService.user()) {
      const data = {
        User: this.authService.user()!._id
      };

      this.membershipService.findAllUser(data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.length > 0) {
              this.membershipService.addMemberships(res);

              const membershipPrimary = this.membershipService.memberships().find(res => res.quantyTime === 1)!;

              if (membershipPrimary) {
                this.myFormOne.patchValue({
                  credit: Number(membershipPrimary!.credit) ?? 0
                });
              }
            }
          },
          error: (err) => {
            this.loading.set(false);
            this.spinnerService.close();
          },
          complete: () => {
            this.loading.set(false);
            this.spinnerService.close();
            console.log('Request completed');
          }
        })
    }
  }

  onSubmit() {
    this.dialogService.closeModal();

    if (!this.myFormBunbles.valid) {
      this.toastService.start({ type: 'error', message: 'formInvalid' });
      return;
    }

    const { quantyTime, discount, credit } = this.myFormBunbles.getRawValue();

    if (quantyTime === 1) {
      this.onSubmitPrimary();
    } else {

      const membership = this.membershipService.memberships()
        .find(res => Number(res.quantyTime) === Number(quantyTime))!;
      if (membership && Number(credit)! < Number(discount)) {
        return;
      }

      this.onSubmitPrimary();
    }
  }

  onSubmitPrimary(): void {

    const { quantyTime, credit, discount } = this.myFormBunbles.getRawValue();

    const data = {
      quantyTime: Number(quantyTime),
      credit: Number(credit),
      discount: Number(discount)
    };

    this.spinnerService.start();
    this.membershipService.create(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.length > 0) {
            this.membershipService.resetMemberships();
            this.membershipService.addMemberships(res);
          }
        },
        error: (err) => {
          this.spinnerService.close();
        },
        complete: () => {
          this.spinnerService.close();
          console.log('Request completed');
        }
      });

  }

  onSubmitDownload(): void {
    if (!this.myFormDownload.valid) {
      this.toastService.start({ type: 'error', message: 'error' });
      return;
    }

    const { creditAmountDownload } = this.myFormDownload.getRawValue();

    const data = {
      creditAmountDownload: Number(creditAmountDownload),
    };

    this.spinnerService.start();
    this.myFormDownload.disable();

    this.userService.update(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.authService.updateUser({
              creditAmountDownload: res.creditAmountDownload
            });
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.myFormDownload.enable();
          this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
        },
        complete: () => {
          this.spinnerService.close();
          this.myFormDownload.enable();
          this.toastService.start({ type: 'success', message: 'completedSuccessfully' });
          console.log('Request completed');
        }
      });
  }

  // delete
  onDeleteModal(item: Membership): void {
    this.dialogService.closeModal();
    this.dialogService.toggleModal('deleteMembership');
    this.membershipId.set(item._id!);
  }

  onDelete(event: Event): void {
    event.preventDefault();

    this.dialogService.closeModal();
    this.spinnerService.start();

    this.membershipService.delete(this.membershipId())
      .subscribe({
        next: (res) => {
          if (res) {
            this.membershipService.removeMemberships(this.membershipId());
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
          console.error('Error deleting', err);
        },
        complete: () => {
          this.spinnerService.close();
          this.toastService.start({ type: 'success', message: 'deletedSuccessfully' });
        }
      });

  }

  onTypeChange(event: any): void {
    const selectedValue = Number(event.target.value);

    const membership = this.membershipService.memberships().find(res => res.quantyTime === selectedValue)!;

    if (membership) {
      this.myFormBunbles.patchValue({
        credit: Number(membership!.credit) ?? 0,
        discount: Number(membership!.discount) ?? 0
      });
    } else {
      const membership = this.membershipService.memberships().find(res => res.quantyTime === 1)!;

      if (membership) {
        this.myFormBunbles.patchValue({
          credit: Number(membership!.credit! * selectedValue) ?? 0,
          quantyTime: selectedValue,
          discount: 0
        });
      }
    }

    if (selectedValue !== 1) {
      this.myFormBunbles.get('credit')?.disable();
    } else {
      this.myFormBunbles.get('credit')?.enable();
    }

  }

  //modal
  onFormBundles(): void {
    this.dialogService.toggleModal('formBundles');

    this.myFormBunbles.get('quantyTime')?.enable();
    this.myFormBunbles.get('credit')?.enable();
  }

  onEditBundles(item: Membership): void {
    this.dialogService.toggleModal('formBundles');
    this.myFormBunbles.patchValue({
      credit: item.creditReal,
      quantyTime: item.quantyTime,
      discount: Number(item.discount) ?? 0
    });

    this.myFormBunbles.get('quantyTime')?.disable();

    if (item.quantyTime !== 1) {
      this.myFormBunbles.get('credit')?.disable();
    }
  }

  // input class
  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
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

  modalClass() {
    return Tools.modalClass();
  }

  cardClass() {
    return Tools.cardClass();
  }
}
