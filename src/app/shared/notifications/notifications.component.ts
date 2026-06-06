import { Component, effect, EventEmitter, inject, OnInit, Output, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { PushNotificationService } from '@services/push-notitication.service';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { BrowserIdService } from '@services/browser-id.service';
import { NotificationService } from '@services/notification.service';
import { IconDirective } from '@directive/coin-svg.directive';
import { DateAgoPipe } from '@pipes/date-ago.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-notifications',
  imports: [
    CommonModule,
    IconDirective,
    DateAgoPipe,
    TranslateModule
  ],
  animations: [
    trigger('notificationAnimation', [
      // :enter - Aparece de abajo hacia arriba
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateY(100px) scale(0.95)' // Comienza 100px más abajo y ligeramente pequeña
        }),
        animate('300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({
          opacity: 1,
          transform: 'translateY(0) scale(1)' // Sube a su posición original con un leve rebote
        }))
      ]),

      // :leave - Se desvanece y colapsa hacia arriba suavemente
      transition(':leave', [
        animate('250ms ease-in', style({
          opacity: 0,
          transform: 'translateY(-20px)', // Se eleva un poco mientras desaparece
          height: 0,                      // Colapsa el tamaño vertical
          marginBottom: 0,                // Elimina los márgenes para que el resto de la lista se mueva fluido
          paddingTop: 0,
          paddingBottom: 0
        }))
      ])
    ])
  ],
  templateUrl: './notifications.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './notifications.component.scss'
})
export default class NotificationsComponent {

  @Output() closeModal = new EventEmitter<void>();
  notifications = this.notificationService.getNotifications();

  constructor(private notificationService: NotificationService) { }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
    this.closeModal.emit();
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }
}

