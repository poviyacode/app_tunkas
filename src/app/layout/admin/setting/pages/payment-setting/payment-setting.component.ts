import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserTransfer } from '@interfaces/userTransfer';
import { SpinnerService } from '@services/spinner.service';
import { UserTransferService } from '@services/user-transfer.service';
import { environment } from '@environments/environment';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Tools } from '@core/common/tools';
import { ToastService } from '@services/toast.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { IconDirective } from '@directive/coin-svg.directive';

@Component({
  selector: 'app-payment-setting',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    CommonModule,
    IconDirective
  ],
  templateUrl: './payment-setting.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./payment-setting.component.scss']
})
export default class PaymentSettingComponent {

  private destroy$ = new Subject<void>();

  myFormAirtm: FormGroup;
  myFormPayPal: FormGroup;

  public userTransferService = inject(UserTransferService);
  private spinnerService = inject(SpinnerService);
  private toastService = inject(ToastService);
  private transactionCreditService = inject(TransactionCreditService);

  ngOnInit(): void {
    this.createFormControls();
    this.findAllUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createFormControls() {
    this.myFormAirtm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
    });

    this.myFormPayPal = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
    });
  }

  // find 
  findAllUser(): void {
    this.userTransferService.findAllUser().subscribe(res => {
      if (res) {
        this.userTransferService.addUserTransfers(res.UserTransfer);
        this.transactionCreditService.addCreditCalculator(res.CreditCalculator);

        const userTransactions = this.userTransferService.userTransfers();
        const oneUserTransaction = userTransactions.find(res => res.type === 'AIRTM' || res.type === 'PAYPAL')!;
        this.userTransferService.addUserTransfer(oneUserTransaction);

        if (oneUserTransaction?.details?.email) {
          if (oneUserTransaction.type === 'AIRTM') {
            this.myFormAirtm.patchValue({ email: oneUserTransaction.details.email });
          } else if (oneUserTransaction.type === 'PAYPAL') {
            this.myFormPayPal.patchValue({ email: oneUserTransaction.details.email });
          }
        }

      }
    })
  }

  onSubmitAirtm(): void {
    const email = this.myFormAirtm.value.email.trim().toLowerCase();
    this.onRegister('AIRTM', email);
  }

  onSubmitPayPal(): void {
    const email = this.myFormPayPal.value.email.trim().toLowerCase();
    this.onRegister('PAYPAL', email);
  }

  onRegister(type: string, email: string): void {
    this.spinnerService.start()
    const data = {
      Money: environment.money,
      type: type,
      details: {
        email: email
      }
    };

    this.userTransferService.create(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.userTransferService.addUserTransfer(res);
            this.userTransferService.addUserTransfers([res]);
            this.spinnerService.close();
            this.toastService.start({ type: 'success', message: 'completedSuccessfully' });
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'somethingWentWrong' });
        },
        complete: () => {
          this.toastService.start({ type: 'success', message: 'completedSuccessfully' });
          console.log('Request completed');
        }
      });
  }

  // input class
  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  textareaClass(formGroup: FormGroup, controlName: string, height: string) {
    return Tools.textareaClass(formGroup, controlName, height);
  }

  selectClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  // button class
  buttonClass() {
    return Tools.buttonClass();
  }

  cardClass() {
    return Tools.cardClass();
  }

}
