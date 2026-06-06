import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

export interface Notification {
  id: string;
  title: string;
  body: string;
  icon: string;
  timestamp: number;
  actions?: { action: string; title: string }[];
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  private notifications = signal<Notification[]>([]);

  getNotifications() {
    return this.notifications.asReadonly();
  }

  addNotification(notification: Omit<Notification, 'id'>) {
    const newNotification = { ...notification, id: Date.now().toString() };
    this.notifications.update((current) => {
      // Limitar a 5 notificaciones
      if (current.length >= 5) {
        // Eliminar la notificación más antigua
        current.shift();
      }
      return [...current, newNotification];
    });

    // Eliminar la notificación automáticamente después de 5 segundos
    setTimeout(() => {
      this.removeNotification(newNotification.id);
    }, 5000);
  }

  removeNotification(id: string) {
    this.notifications.update((current) =>
      current.filter((n) => n.id !== id)
    );
  }

}