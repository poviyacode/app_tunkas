import { Routes } from '@angular/router';
import path from 'path';

export default [
  {
    path: '',
    loadComponent: () => import('../profile/pages/main-profile/main-profile.component'),
    children: [
      {
        path: '',
        loadComponent: () => import('../profile/pages/posts-profile/posts-profile.component'),
        children: [
          {
            path: 'pu/:slug', // Ruta con parámetro dinámico
            loadComponent: () =>
              import('../../layout/post/pages/details-post/details-post.component'),
          },
        ],
      },
      //   {
      //     path: 'subscribers',
      //     loadComponent: () => import('./pages/posts-profile/posts-profile.component'),
      //   },
      //   {
      //     path: 'free',
      //     loadComponent: () => import('./pages/posts-profile/posts-profile.component'),
      //   },
      //   {
      //     path: 'media',
      //     loadComponent: () => import('./pages/media-profile/media-profile.component'),
      //   },
      //   {
      //     path: 'photos',
      //     loadComponent: () => import('./pages/media-profile/media-profile.component'),
      //   },
      //   {
      //     path: 'videos',
      //     loadComponent: () => import('./pages/media-profile/media-profile.component'),
      //   },
      //   {
      //     path: 'pay/:id_payment_order',
      //     loadComponent: () => import('./pages/notification-pay-profile/notification-pay-profile.component'),
      //   },
    ],
  },
] as Routes;
