import {
  Component, inject, PLATFORM_ID, ViewChild, ViewContainerRef,
  signal, HostListener, OnInit, OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { ApplicationRef, NgZone } from '@angular/core'; // Inyecciones clave para la estabilidad
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '@services/auth.service';
import { ToolsService } from '@services/tools.service';
import { ToastService } from '@services/toast.service';
import { SpinnerService } from '@services/spinner.service';
import { DialogService } from '@services/dialog.service';
import { UserActivityService } from '@services/user-activity.service';
import { PushNotificationService } from '@services/push-notitication.service';
import { NotificationService } from '@services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';

import { IconDirective } from '@directive/coin-svg.directive';
import KissmeComponent from '@shared/kissme/kissme.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    TranslateModule,
    IconDirective,
    KissmeComponent
],
  animations: [
    trigger('toastTrigger', [
      // 1. ANIMACIÓN DE ENTRADA
      transition(':enter', [
        // Añadimos el '-50%' en el eje X aquí para que nazca centrado
        style({
          opacity: 0,
          transform: 'translate(-50%, 20px) scale(0.95)',
          filter: 'blur(4px)'
        }),
        // Mantiene el '-50%' en X y reduce el eje Y a 0
        animate('400ms cubic-bezier(0.23, 1, 0.32, 1)',
          style({
            opacity: 1,
            transform: 'translate(-50%, 0) scale(1)',
            filter: 'blur(0)'
          })
        )
      ]),

      // 2. ANIMACIÓN DE SALIDA
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 1, 1)',
          style({
            opacity: 0,
            transform: 'translate(-50%, 10px) scale(0.98)',
            filter: 'blur(2px)'
          })
        )
      ])
    ])
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'app-yuvinka';

  // 1. Convertimos isStable en un Signal para que sea reactivo y eficiente en el HTML si lo necesitas
  isStable = signal(false);
  isBrowser: boolean;

  isActive = signal(true);
  notificaciones: any[] = [];
  audio: HTMLAudioElement | null = null;

  private stableSubscription!: Subscription;

  @ViewChild('container', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;

  // Inyecciones
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  public toastService = inject(ToastService);
  public spinnerSevice = inject(SpinnerService);
  public dialogService = inject(DialogService);
  public toolsService = inject(ToolsService);
  private translate = inject(TranslateService);
  private userActivityService = inject(UserActivityService);
  private pushNotificationService = inject(PushNotificationService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  private appRef = inject(ApplicationRef); // Controlar la estabilidad de la app
  private ngZone = inject(NgZone);         // Sacar procesos fuera de Zone.js

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.initAppLogic();
      this.monitorStability();
    }
  }

  ngOnDestroy() {
    // 2. Limpieza vital para evitar fugas de memoria con la suscripción asíncrona
    if (this.stableSubscription) {
      this.stableSubscription.unsubscribe();
    }
  }

  private monitorStability() {
    // 3. Escuchar cuándo Angular declara que la app no tiene tareas pendientes (Estable)
    this.stableSubscription = this.appRef.isStable.subscribe(stable => {
      this.isStable.set(stable);
      //console.log('¿La aplicación está estable?:', stable);
    });
  }

  private initAppLogic() {
    this.changeLangDefault();

    // 4. Si 'userActivity' mantiene timers, intervalos o peticiones infinitas de polling, 
    // es mejor correrlo fuera de Angular para que no bloquee el "isStable" de la hidratación.
    this.ngZone.runOutsideAngular(() => {
      this.userActivity();
    });
  }

  @HostListener('window:storage', ['$event'])
  handleStorageEvent(event: StorageEvent) {
    if (event.newValue === null) {
      this.ngZone.run(() => {
        this.router.navigate(['/auth']);
      });
    }
  }

  @HostListener('document:contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    if (environment.production) event.preventDefault();
  }

  private changeLangDefault() {
    const supportedLanguages = ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt_BR', 'ru', 'tr', 'zh'];
    let lang = 'en';

    const storedLang = localStorage.getItem('language');
    if (storedLang && supportedLanguages.includes(storedLang)) {
      lang = storedLang;
    } else {
      const browserLang = window.navigator.language.split('-')[0];
      if (supportedLanguages.includes(browserLang)) lang = browserLang;
    }

    this.translate.use(lang).subscribe(() => {
      this.toolsService.languageCreate(lang);
    });
  }

  private userActivity() {
    this.userActivityService.userActive$.subscribe(active => {
      // Como esto corre fuera de Angular, volvemos a entrar solo para mutar el Signal de la UI
      this.ngZone.run(() => {
        this.isActive.set(active);
      });
    });
  }

  eventNotification() {
    const eventPush = this.pushNotificationService.eventPushNotification();
    if (eventPush?.event === 'SEND') {
      if (eventPush.message.data.sound) this.playSound();

      this.notificationService.addNotification({
        ...eventPush.message.notification,
        timestamp: eventPush.message.notification.timestamp
      });
    }
  }

  private playSound() {
    if (!this.audio) {
      this.audio = new Audio('assets/sounds/notification.mp3');
    }
    this.audio.play().catch(err => console.warn('Audio play blocked by browser'));
  }
}