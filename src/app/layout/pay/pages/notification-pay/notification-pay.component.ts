import { Component, inject, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentOrderService } from '@services/payment-order.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { SpinnerService } from '@services/spinner.service';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { IconDirective } from '@directive/coin-svg.directive';

@Component({
  selector: 'app-notification-pay',
  imports: [
    TranslateModule,
    IconDirective
  ],
  templateUrl: './notification-pay.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './notification-pay.component.scss'
})
export default class NotificationPayComponent {

  isBrowser: boolean;
  isServer: boolean;

  codeCollection: any;
  paymentOrder: any;

  private activatedRoute = inject(ActivatedRoute);
  public router = inject(Router);
  private paymentOrderService = inject(PaymentOrderService);
  private spinnerService = inject(SpinnerService);
  private platformId = inject(PLATFORM_ID);

  private subscriptions: Subscription[] = [];
  observer: IntersectionObserver;

  constructor(
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    this.codeCollection = this.activatedRoute.snapshot.paramMap.get('code_collection');

    this.router.navigate(['/admin/purchases/active']);
  }

  ngOnInit(): void {
    this.findOne();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  findOne() {
    if (this.codeCollection) {
      this.spinnerService.start();
      this.paymentOrderService.findOneCode(this.codeCollection).subscribe({
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
