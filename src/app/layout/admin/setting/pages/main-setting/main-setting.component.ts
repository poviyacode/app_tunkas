import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Component, computed, effect, ElementRef, HostListener, inject, OnInit, PLATFORM_ID, signal, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { IconDirective } from '@directive/coin-svg.directive';
import { User, UserRole } from '@interfaces/user';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { TransactionCreditService } from '@services/transaction-credit.service';
import { UserCreditService } from '@services/user-credit.service';
import { UserService } from '@services/user.service';
import { filter, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-main-setting',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    RouterModule,
    IconDirective,
  ],
  templateUrl: './main-setting.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./main-setting.component.scss']
})
export default class MainSettingComponent implements OnInit {

  isBrowser: boolean;
  isServer: boolean;

  public getScreenWidth: any;
  public getScreenHeight: any;
  openMobil = signal(false);
  openSidebar: boolean = true;

  isMobile = false; // Detectar si es móvil
  showSidebar = true; // Controlar la visibilidad del sidebar
  selectedContent = false; // Controlar si se muestra el contenido

  user: User;
  private subscriptions: Subscription[] = [];
  private destroy$ = new Subject<void>();

  public router = inject(Router);
  private userService = inject(UserService);
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private title = inject(Title);
  private userCreditService = inject(UserCreditService);
  private transactionCreditService = inject(TransactionCreditService);
  private activatedRoute = inject(ActivatedRoute);

  constructor() {

    this.title.setTitle('Yuvinka :: Settings');
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    effect(() => {
      if (!this.authService.user()) {
        this.router.navigate(['/auth/login']);
      }
    });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.handleRouteChange();
      });

    if (this.isBrowser) {
      this.isMobile = window.innerWidth < 1024;
      this.handleRouteChange();
    }
  }

  links = computed(() => {
    const currentUser = this.authService.user();

    // Base de links que siempre están
    let currentLinks = [
      { path: '/admin/setting/account', title: 'account', icon: 'user-regular' },
      { path: '/admin/setting/notification', title: 'Notification', icon: 'notifications-regular' }
    ];

    // Si no está aprobado, mostrar onboarding
    if (currentUser?.statusPersonal !== 'APPROVED') {
      currentLinks = [
        { path: '/admin/setting/creator-onboarding', title: 'becomeACreator', icon: 'attach-money-regular' },
        ...currentLinks
      ];
    }

    // Si está aprobado Y es CREATOR, mostrar opciones de pago/membresía
    // Nota: Usa el enum UserRole.CREATOR si lo tienes disponible
    if (currentUser?.statusPersonal === 'APPROVED' && currentUser?.roles?.includes('CREATOR' as UserRole)) {
      currentLinks = [
        { path: '/admin/setting/membership', title: 'subscription', icon: 'finance-chip-regular' },
        { path: '/admin/setting/payment', title: 'paymentMethods', icon: 'account-balance-regular' },
        ...currentLinks
      ];
    }

    return currentLinks;
  });

  ngOnInit(): void {

    if (this.isBrowser) {

    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isMobile = window.innerWidth < 1024;
    this.handleRouteChange();
  };

  @ViewChild('scrollContainer') scrollContainer: ElementRef;
  scroll(distance: number) {
    this.scrollContainer.nativeElement.scrollTo({
      left: this.scrollContainer.nativeElement.scrollLeft + distance,
      behavior: 'smooth'
    });
  }

  handleRouteChange() {

    const url = this.router.url;
    const urlSegments = url.split('/').filter(segment => segment.trim() !== '');
    const validRoutes = ['profile', 'account', 'membership', 'payment', 'notification', 'creator-onboarding'];
    const currentRoute = validRoutes.find(route => urlSegments.includes(route));

    if (currentRoute) {
      if (this.isMobile) {
        this.showSidebar = false;
      }
      this.selectedContent = true;
      this.router.navigate([`admin/setting/${currentRoute}`]);
    } else {
      if (this.isMobile) {
        this.showSidebar = true;
        this.selectedContent = false;
      } else {
        this.selectedContent = true;
        this.router.navigate([`admin/setting/account`]);
      }
    }
  }

  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
    this.router.navigate([`/`]);
  }

  onLinkClick(link: any) {
    if (this.isMobile) {
      this.showSidebar = false; // Ocultar el sidebar
      this.selectedContent = true; // Mostrar el contenido
    } else {
      this.selectedContent = true; // Mostrar el contenido
    }
    this.router.navigate([link.path]); // Navegar al enlace seleccionado
  }

  goBackToSidebar() {
    this.selectedContent = false; // Ocultar el contenido
    this.showSidebar = true; // Mostrar el sidebar
    this.router.navigate([`admin/setting`]);
  }

  // roles
  getRoles(role: string): boolean {
    return !!this.authService.user()?.roles?.includes(role as UserRole);
  }
}
