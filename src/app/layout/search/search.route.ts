import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/main-search/main-search.component'),
    children: [
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full'
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users-search/users-search.component'),
      },
      {
        path: 'posts',
        loadComponent: () => import('./pages/posts-search/posts-search.component'),
        children: [
          {
            path: 'pu/:slug',
            loadComponent: () =>
              import('@layout/post/pages/details-post/details-post.component'),
          },
        ],
      },
    ]
  },
] as Routes;
