import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { UserService } from '../../../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentOrderService } from '@services/payment-order.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { SpinnerService } from '@services/spinner.service';

@Component({
    selector: 'app-notification-pay-profile',
    imports: [
        TranslateModule
    ],
    templateUrl: './notification-pay-profile.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './notification-pay-profile.component.scss'
})
export default class NotificationPayProfileComponent {

  codeCollection: any;
  paymentOrder: any;

  private destroy$ = new Subject<void>();
  
  private activatedRoute = inject(ActivatedRoute);
  public router = inject(Router);
  private paymentOrderService = inject(PaymentOrderService);
  private spinnerService = inject(SpinnerService);

  constructor(
  ) {
    this.codeCollection = this.activatedRoute.snapshot.paramMap.get('id_payment_order');
  }

  ngOnInit(): void {
    this.findOne();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  findOne() {
    if (this.codeCollection) {
      this.spinnerService.start();
      this.paymentOrderService.findOneCode(this.codeCollection)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.paymentOrder = res;
            this.spinnerService.close();
          }
        },
        error: (err) => {
          this.spinnerService.close();
        },
        complete: () => {
          console.log('Request completed');
        }
      });
    }
  }
}
