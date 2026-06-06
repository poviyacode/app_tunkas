import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Tools } from '@core/common/tools';
import { TransactionCredit } from '@interfaces/transactionCredit';
import { SpinnerService } from '@services/spinner.service';
import { ToastService } from '@services/toast.service';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { DialogService } from '@services/dialog.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { UserTransferService } from '@services/user-transfer.service';
import { Subject, takeUntil } from 'rxjs';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-withdrawal-money-activity',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
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
  templateUrl: './withdrawal-money-activity.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './withdrawal-money-activity.component.scss'
})
export default class WithdrawalMoneyActivityComponent {

  loading: boolean;

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
  private destroy$ = new Subject<void>();

  myForm: FormGroup;

  public dialogService = inject(DialogService);
  public transactionCreditService = inject(TransactionCreditService);
  public userTransferService = inject(UserTransferService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private spinnerService = inject(SpinnerService);
  public router = inject(Router);

  ngOnInit(): void {
    this.createFormControls();

    if (this.authService.user()) {
      this.findAllUser();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createFormControls() {
    const profitValue = this.transactionCreditService.balanceTransactionCredit()?.availableMoney.toFixed(2) || '0.00';
    this.myForm = new FormGroup({
      amount: new FormControl(profitValue, [
        Validators.required,
        Validators.min(5),
        Validators.max(Number(profitValue)),
        Validators.pattern('^[0-9]+(\\.[0-9]{1,2})?$')
      ])
    });
  }

  // find 
  findAllUser(): void {
    this.loading = true;
    this.userTransferService.findAllUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.userTransferService.addUserTransfers(res.UserTransfer);
            this.transactionCreditService.addCreditCalculator(res.CreditCalculator);

            const oneUserTransaction = res.UserTransfer.find(res => res.type === 'AIRTM' || res.type === 'PAYPAL')!;
            this.userTransferService.addUserTransfer(oneUserTransaction);
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
        },
        complete: () => {
          console.log('Request completed');
        }
      })
  }

  onSubmit(): void {
    if (!this.authService.user()?.statusPersonal || this.authService.user()?.statusPersonal !== 'APPROVED') {
      this.router.navigate(['admin/personal']);
    } else {
      this.onSend();
    }
  }

  onSend(): void {
    if (this.myForm.valid && this.authService.user() && this.userTransferService.userTransfer()) {
      this.dialogService.closeModal();
      this.spinnerService.start();
      const data = {
        amount: Number(this.myForm.value.amount),
        UserTransfer: this.userTransferService.userTransfer()?._id
      };

      this.transactionCreditService.withdrawalRequest(data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res) {
              const currents = this.transactionCreditService.transactionCredits();
              const updateds = [res.TransactionCredit, ...currents];
              this.transactionCreditService.addTransactionCredits(updateds);

              this.transactionCreditService.addBalanceTransactionCredit(res.accountBalance);
              this.spinnerService.close();
              this.toastService.start({ type: 'success', message: 'completedSuccessfully' });
            }
          },
          error: (err) => {
            if (err.error.message === 'ExistPendding') {
              this.toastService.start({ type: 'error', message: 'requestInProcess' });
            } else {
              this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
            }

            this.spinnerService.close();
          },
          complete: () => {
            console.log('Request completed');
          }
        });
    }
  }

  //  input class
  inputClass(formGroup: FormGroup, controlName: string,) {
    return Tools.inputClass(formGroup, controlName);
  }

  cardModalClass() {
    return Tools.cardModalClass();
  }
}
