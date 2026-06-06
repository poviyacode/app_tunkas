import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UserService } from '@services/user.service';
import { UserCreditService } from '@services/user-credit.service';
import { TransactionCreditService } from '@services/transaction-credit.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private userCreditService: UserCreditService,
    private transactionCreditService: TransactionCreditService,
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router
  ) { }

  async canActivate(): Promise<boolean> {
    // 1. Si no es el navegador (SSR), no bloqueamos la renderización inicial
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    const localUser = this.authService.user();

    // 2. Si localmente no hay sesión, rebote inmediato al /auth (Ultra rápido)
    if (!localUser) {
      this.router.navigateByUrl('/auth');
      return false;
    }

    // 3. Si localmente YA sabemos que está suspendido, bloqueo inmediato
    if (localUser.status === 'SUSPENDED' || localUser.status === 'DELETED') {
      this.router.navigateByUrl(`/${localUser.username}`);
      this.authService.logout();
      return false;
    }

    /**
     * ⚡ OPTIMIZACIÓN DE ALTO RENDIMIENTO (Estrategia Asíncrona de Fondo)
     * Dejamos pasar al usuario DE INMEDIATO para que la navegación sea instantánea.
     * Al mismo tiempo, disparamos la petición a la base de datos en segundo plano (background)
     * para verificar si un administrador lo suspendió recientemente.
     */

    this.userService.findOneCurrent(localUser._id!)
      .then(updatedUser => {
        const { User, UserCredit, CreditCalculator } = updatedUser;
        if (User) {
          this.authService.addUser(User);
          this.userCreditService.addUserCredit(UserCredit!);
          this.transactionCreditService.addCreditCalculator(CreditCalculator!);
          // Si descubrimos en segundo plano que lo suspendieron, lo sacamos en ese instante
          if (User.status === 'SUSPENDED' || User.status === 'DELETED') {
            this.router.navigateByUrl(`/${User.username}`);
            this.authService.logout();
          }
        }
      })
      .catch(error => {
        // Si el token cayó o fue eliminado en el servidor, lo deslogueamos en diferido
        console.error('Error verificando estado de usuario:', error);
        if (error.status === 401 || error.status === 403) {
          this.router.navigateByUrl('/auth');
        }
      });

    // Retornamos true INMEDIATAMENTE. El usuario no sentirá retrasos al cambiar de página.
    return true;
  }
}