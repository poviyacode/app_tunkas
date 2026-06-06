import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay } from 'rxjs';
import { environment } from '@environments/environment';
import { Headers } from '../core/common/http-headers';
import { SocialMedia } from '@interfaces/socialMedia';

@Injectable({
  providedIn: 'root'
})
export class SocialMediaService {

  apiUrl = `${environment.api}/social-media`;

  private http = inject(HttpClient);


  create(data: any): Observable<SocialMedia> {
    return this.http.post<SocialMedia>(this.apiUrl + '/user', data, Headers.HttpOptions());
  }

  update(id: string, data: any): Observable<SocialMedia> {
    return this.http.put<SocialMedia>(this.apiUrl + '/' + id, data, Headers.HttpOptions());
  }

  delete(id: string): Observable<SocialMedia> {
    return this.http.delete<SocialMedia>(this.apiUrl + '/' + id, Headers.HttpOptions());
  }

  reorderSocialMedia(updateOrderDto: { orders: { _id: string, order: number }[] }) {
    return this.http.patch<SocialMedia[]>(this.apiUrl + '/reorder', updateOrderDto, Headers.HttpOptions());
  }

  private readonly socialMediaArray = [
    {
      icon: './public/social-media/whatsapp.png',
      type: 'WhatsApp',
      url: 'https://wa.me/', 
    },
    {
      icon: './public/social-media/facebook.png',
      type: 'Facebook',
      url: 'https://www.facebook.com/',
    },
    {
      icon: './public/social-media/x.png',
      type: 'X',
      url: 'https://x.com/',
    },
    {
      icon: './public/social-media/youtube.png',
      type: 'YouTube',
      url: 'https://www.youtube.com/',
    },
    {
      icon: './public/social-media/telegram.png',
      type: 'Telegram',
      url: 'https://t.me/',
    },
    {
      icon: './public/social-media/onlyfans.png',
      type: 'Onlyfans',
      url: 'https://www.onlyfans.com/',
    },
    {
      icon: './public/social-media/instagram.png',
      type: 'Instagram',
      url: 'https://www.instagram.com/',
    },
    {
      icon: './public/social-media/tiktok.png',
      type: 'TikTok',
      url: 'https://www.tiktok.com/@',
    },
    {
      icon: './public/social-media/amazon.png',
      type: 'Amazon',
      url: 'https://www.amazon.com/',
    },
    {
      icon: './public/social-media/linkedin.png',
      type: 'Linkedin',
      url: 'https://www.linkedin.com/',
    },
    {
      icon: './public/social-media/twitch.png',
      type: 'Twitch',
      url: 'https://www.twitch.tv/',
    },
    {
      icon: './public/social-media/snapchat.png',
      type: 'Snapchat',
      url: 'https://www.snapchat.com/',
    },
    {
      icon: './public/social-media/discord.png',
      type: 'Discord',
      url: 'https://discord.com/',
    },
    {
      icon: './public/social-media/patreon.png',
      type: 'Patreon',
      url: 'https://www.patreon.com/',
    },
    {
      icon: './public/social-media/pinterest.png',
      type: 'Pinterest',
      url: 'https://www.pinterest.com/',
    },
    {
      icon: './public/social-media/likee.png',
      type: 'Likee',
      url: 'https://www.likee.video/',
    },
    {
      icon: './public/social-media/etsy.png',
      type: 'Etsy',
      url: 'https://www.etsy.com/',
    },
    {
      icon: './public/social-media/fanvue.webp',
      type: 'Fanvue',
      url: 'https://www.fanvue.com/',
    },
    { icon: './public/social-media/website.png', type: 'website', url: '' },
  ];

  // Retorna todo el array para selects o listas de configuración
  getConfig() {
    return this.socialMediaArray;
  }

  // Lógica centralizada para obtener el icono correcto
  getIconPath(type: string): string {
    const social = this.socialMediaArray.find(
      s => s.type.toLowerCase() === type?.toLowerCase()
    );
    return social ? social.icon : './public/social-media/website.png';
  }
}
