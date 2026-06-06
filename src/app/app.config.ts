import { ApplicationConfig, provideZoneChangeDetection, isDevMode, importProvidersFrom } from '@angular/core';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withDebugTracing, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withNoIncrementalHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslation } from '@core/config/i18n/translate-loader.config';
import { provideAnimations } from '@angular/platform-browser/animations';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { environment } from '@environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(PreloadAllModules),
    ),
    provideHttpClient(withFetch()),
    provideClientHydration(withNoIncrementalHydration()),
    importProvidersFrom(TranslateModule.forRoot(provideTranslation())),
    provideAnimations(),

    provideFirebaseApp(() => initializeApp(environment.configFirebase)),
    provideFirestore(() => getFirestore()),
    provideMessaging(() => getMessaging()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
};
