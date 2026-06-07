import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Tools } from '@core/common/tools';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { EmailService } from '@services/email.service';
import { TagService } from '@services/tag.service';
import { ToastService } from '@services/toast.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-verified-account-auth',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    CommonModule,
    RouterModule
  ],
  templateUrl: './verified-account-auth.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './verified-account-auth.component.scss'
})
export default class VerifiedAccountAuthComponent {

  myForm: FormGroup;
  isVerifying = false;
  verificationCode: Number;
  private destroy$ = new Subject<void>();

  private tagService = inject(TagService);
  public authService = inject(AuthService);
  private emailService = inject(EmailService);
  private router = inject(Router);
  public toastService = inject(ToastService);

  ngOnInit(): void {
    this.createFormControls();

    if (!this.authService.user()?.emailVerified) {
      //this.sendEmail();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createFormControls() {
    this.myForm = new FormGroup({
      verificationCode: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)])
    });
  }

  // Function to verify the email with the entered code
  verifyEmail() {

    if (this.authService.user()?.emailVerified) {
      return;
    }

    if (this.myForm.invalid) return;

    this.isVerifying = true;
    const code = Number(this.myForm.value.verificationCode);

    if (code === this.verificationCode) {
      const data = {

      };

      this.authService.verifiedAccount(data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.router.navigateByUrl('/');
          },
          error: (err) => {

          },
          complete: () => {
            this.myForm.enable();
          }
        });
    } else {
      this.myForm.enable();
    }
  }

  // input class
  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  textareaClass(formGroup: FormGroup, controlName: string, height: string) {
    return Tools.textareaClass(formGroup, controlName, height);
  }
}
