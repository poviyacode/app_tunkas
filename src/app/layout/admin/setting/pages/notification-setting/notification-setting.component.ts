import { Component, effect, inject, Input, OnInit, PLATFORM_ID, signal, ChangeDetectionStrategy } from '@angular/core';
import { PushNotificationService } from '@services/push-notitication.service';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { BrowserIdService } from '@services/browser-id.service';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tools } from '@core/common/tools';
import { ToolsService } from '@services/tools.service';
import { concatMap, filter, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { ToastService } from '@services/toast.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { environment } from '@environments/environment';
import { SwPush } from '@angular/service-worker';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { DialogService } from '@services/dialog.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { NotificationService } from '@services/notification.service';
import { SpinnerService } from '@services/spinner.service';

@Component({
  selector: 'app-notification-setting',
  imports: [
    CommonModule,
    IconDirective,
    TranslateModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule
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
  templateUrl: './notification-setting.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './notification-setting.component.scss'
})
export default class NotificationSettingComponent {

  isBrowser: boolean;
  isServer: boolean;

  public isModalOpen = false;
  public isNotificationActive = signal(false);

  myform: FormGroup;

  currentRoute: string | null = null;

  deviceInfo = signal<any>(null);
  subscription = signal<PushSubscription | null>(null);
  error: string | null = null;

  private resolveModal!: (response: boolean) => void;

  //sound
  audio: HTMLAudioElement | null = null;

  private destroy$ = new Subject<void>();

  public pushNotificationService = inject(PushNotificationService);
  private browserIdService = inject(BrowserIdService);
  private platformId = inject(PLATFORM_ID);
  public toolsService = inject(ToolsService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);
  private swPush = inject(SwPush);
  public router = inject(Router);
  public dialogService = inject(DialogService);
  private notificationService = inject(NotificationService);
  private spinnerService = inject(SpinnerService);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    this.getDeviceInfo();

    effect(() => {
      if (this.pushNotificationService.pushNotification()) {
        this.isNotificationActive.set(true);
      } else {
        this.isNotificationActive.set(false);
      }
      this.myform.get('isNotificationActive')?.setValue(this.isNotificationActive());
    });

  }

  async ngOnInit() {
    this.createFormControls();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createFormControls() {
    this.myform = new FormGroup({
      isNotificationActive: new FormControl(this.isNotificationActive(), Validators.nullValidator),
    });
  }

  create(): void {

    if (!this.subscription() || !this.deviceInfo()) {
      this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
      return;
    }

    const subscription = this.subscription();
    const deviceInfo = this.deviceInfo();
    const data = {
      token: subscription,
      ...deviceInfo
    };

    this.spinnerService.start();

    this.pushNotificationService.create(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.pushNotificationService.resetPushNotification();
          if (res && res.User === this.authService.user()?._id) {
            //this.eventNotification();
            this.pushNotificationService.addPushNotification(res);
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
        },
        complete: () => {
          this.spinnerService.close();
          this.toastService.start({ type: 'success', message: 'notificationEnabled' });
        }
      });
  }

  async getDeviceInfo() {
    const deviceInfo = await this.browserIdService.getFullDeviceInfo()!;
    this.deviceInfo.set(deviceInfo);
    // const browserId = this.deviceInfo().browserId;
    // if (browserId && this.authService.user() && this.currentRoute !== 'admin' && environment.production) {
    //   await this.requestPermission();
    // }
  }

  onSubmit() {
    if (this.myform.valid) {
      if (!this.isNotificationActive()) {
        this.enableNotifyConfirm('refreshToken');
      } else {
        this.onUnsubscribe();
      }
    }
  }
  // Habilitar notificaciones
  async enableNotifyConfirm(value: string) {

    if (!this.swPush.isEnabled && environment.production) {
      throw new Error('El service worker no está disponible.');
    }

    try {
      if (Notification.permission !== 'granted' && environment.production) {
        // Si no hay permiso, solicitar suscripción
        const subscription = await this.requestSubscription();
        //Extraer el token completo
        const token = this.extractTokenFromSubscription(subscription);
        this.subscription.set(token);
      } else {

        const isConfirm = await this.showConfirmationRefreshTokenModal();
        if (isConfirm) {
          const subscription = await this.requestSubscription();
          const token = this.extractTokenFromSubscription(subscription);
          this.subscription.set(token);
        } else {
          // Retornar la suscripción existente
          const subscription = await this.getSubscription();
          const token = this.extractTokenFromSubscription(subscription!);
          this.subscription.set(token);
        }
      }

      if (this.subscription()) {
        this.create();
      }

    } catch (error: any) {
      this.toastService.start({ type: 'error', message: 'enableNotifications' });
    }
  }

  private extractTokenFromSubscription(subscription: PushSubscription): any {
    const jsonSubscription = subscription.toJSON();
    return jsonSubscription;
  }

  // modal
  private showConfirmationRefreshTokenModal(): Promise<boolean> {
    this.isModalOpen = true;
    this.dialogService.toggleModal('confirmNotificationRefreshToken');

    return new Promise((resolve) => {
      this.resolveModal = resolve; // Guardamos la función resolve para usarla más tarde
    });
  }

  // Manejar la respuesta del modal
  handleModalResponseOne = (response: boolean): void => {
    if (!this.resolveModal) {
      return;
    }

    this.dialogService.closeModal();
    this.resolveModal(response); // Resolvemos la promesa con la respuesta del usuario
  };

  onCloseModal() {
    // let url = 'https://tiktok.com';
    // window.open(`${url}`, "_parent", "noopener,noreferrer");
    this.dialogService.closeModal();
  }

  // Solicitar una nueva suscripción
  private async requestSubscription(): Promise<PushSubscription> {
    if (!environment.publicKey) {
      throw new Error('La clave pública (publicKey) no está configurada en el archivo environment.');
    }

    if (!this.swPush.isEnabled) {
      throw new Error('El service worker no está disponible.');
    }

    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: environment.publicKey,
      });

      return subscription;
    } catch (error: any) {
      throw new Error('No se pudo generar la suscripción.');
    }
  }

  // Obtener la suscripción actual
  private async getSubscription(): Promise<PushSubscription | null> {
    if (!this.swPush.isEnabled) {
      throw new Error('El service worker no está disponible.');
    }

    try {
      const subscription = await firstValueFrom(this.swPush.subscription);
      if (subscription) {
        return subscription;
      } else {
        throw new Error('No hay una suscripción activa.');
      }
    } catch (error: any) {
      throw new Error('No se pudo obtener la suscripción.');
    }
  }

  // Cancelar la suscripción
  onUnsubscribe(): void {

    this.spinnerService.start();
    if (!this.authService.user()) {
      return;
    }

    if (this.swPush.isEnabled && Notification.permission === 'granted') {
      this.swPush.unsubscribe();
    }

    if (!this.deviceInfo()) {
      this.spinnerService.close();
      this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
      return;
    }

    const deviceInfo = this.deviceInfo();

    this.pushNotificationService.deleteToken(deviceInfo.browserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && Number(res.deletedCount) === 1) {
            this.pushNotificationService.resetPushNotification();
            this.isNotificationActive.set(false);
            this.myform.get('isNotificationActive')?.setValue(this.isNotificationActive());
          } else {
            this.isNotificationActive.set(true);
            this.myform.get('isNotificationActive')?.setValue(this.isNotificationActive());
          }
        },
        error: (err) => {
          this.spinnerService.close();
          this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
        },
        complete: () => {
          this.spinnerService.close();
          this.toastService.start({ type: 'success', message: 'completedSuccessfully' });
        }
      });
  }

  // Limpiar suscripciones
  private cleanupSubscriptions(subscriptions: { unsubscribe: () => void }[]): void {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  // Configurar escuchadores de eventos
  eventNotification() {
    const eventPush = this.pushNotificationService.eventPushNotification()!;
    if (!eventPush) {
      return;

    }
    const { event, message } = eventPush;

    if (event === 'SEND') {

      if (message.data.sound) {
        // Reproducir el sonido
        this.playSound();
      }
      console.log('event 3')
      const notification = message.notification;
      this.notificationService.addNotification({
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        timestamp: notification.timestamp,
        actions: notification.actions,
      });
    }
  }

  // default  -----------------------------
  async enableNotifyDefault() {
    try {

      if (!this.authService.user()) {
        return;
      }

      const subscription = await this.pushNotificationService.enableNotify();
      this.subscription.set(subscription);
      this.error = null; // Limpiar errores anteriores

      if (!this.subscription) {
        return;
      }

      this.create();

    } catch (err: any) {
      this.toastService.start({ type: 'error', message: 'enableNotifications' });
    }
  }

  // Obtener la suscripción
  async getSubscriptionDefaul() {
    try {
      const subscription = await this.pushNotificationService.getSubscription();
      this.subscription.set(subscription);
      this.error = null; // Limpiar errores anteriores

    } catch (err: any) {
      this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
    }
  }

  // Desuscribirse
  unsubscribeDefaul(): void {

    if (!this.authService.user()) {
      return;
    }

    this.pushNotificationService.unsubscribe();
    this.subscription.set(null); // Limpiar la suscripción
    this.error = null; // Limpiar errores

    if (!this.deviceInfo()) {
      this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
      return;
    }

    const deviceInfo = this.deviceInfo();

    this.pushNotificationService.deleteToken(deviceInfo.browserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && Number(res.deletedCount) === 1) {
            this.pushNotificationService.resetPushNotification();
          }
        },
        error: (err) => {
          this.toastService.start({ type: 'error', message: 'pleaseTryAgain' });
        },
        complete: () => {
          this.toastService.start({ type: 'success', message: 'completedSuccessfully' });
        }
      });
  }

  eventNotificationDefault() {
    const data = this.pushNotificationService.eventPushNotification()!;
    if (!data) {
      return;
    }

    const { event, message } = data;
    if (event === 'MESSAGES') {
      console.log('Notificación:', message);
    }
  }

  // notification
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {

        this.swPush.requestSubscription({
          serverPublicKey: environment.publicKey,
        }).then(subscription => {

          this.subscription.set(subscription);

          if (!this.subscription) {
            return;
          }

          this.create();

        }).catch(err => {
          console.error('No se pudo obtener la suscripción', err);
        });

      }

    } catch (error) {
      console.error('Ocurrió un error al solicitar el permiso:', error);
    }
  }

  showNotification() {
    const title = '¡Hola!';
    const options = {
      body: 'Esta es una notificación desde Angular.',
      icon: 'assets/icons/icon.png',
    };
    this.pushNotificationService.showNotification(title, options);
  }

  playSound() {
    if (!this.audio) {
      this.audio = new Audio('public/sounds/universfield-notification.mp3');
    }
    this.audio.play().catch((error) => {
      console.error('Error playing sound:', error);
    });
  }

  // input class
  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  selectClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  textareaClass(formGroup: FormGroup, controlName: string, height: string) {
    return Tools.textareaClass(formGroup, controlName, height);
  }

  buttonClass() {
    return Tools.buttonClass();
  }

  cardClass() {
    return Tools.cardClass();
  }

  modalClass() {
    return Tools.modalClass();
  }

  buttonClassForm(value: boolean) {
    return Tools.buttonClassForm(value);
  }

  buttonSecondaryClass() {
    return Tools.buttonSecondaryClass();
  }

  cardModalClass() {
    return Tools.cardModalClass();
  }

}
