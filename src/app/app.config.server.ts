import { provideServerRendering } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { appConfig } from './app.config';

@Injectable()
export class ServerI18nInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Si la petición es para buscar un archivo de traducción .json
    if (req.url.includes('.json')) {
      // Forzamos a Node.js a pedirlo por HTTP plano (http://localhost:4200) 
      // para saltarnos el problema del certificado SSL autofirmado (https) en desarrollo
      const serverUrl = 'http://localhost:4200';

      // Limpiamos la ruta eliminando los puntos iniciales si existen
      const cleanUrl = req.url.replace(/^\.\//, '/');

      const serverReq = req.clone({
        url: `${serverUrl}${cleanUrl}`
      });
      return next.handle(serverReq);
    }
    return next.handle(req);
  }
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // Registramos el interceptor solo para el lado del servidor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ServerI18nInterceptor,
      multi: true
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);