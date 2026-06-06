import { Routes, UrlSegment } from '@angular/router';

// Función matcher
const subscribersMatcher = (segments: UrlSegment[]) => {
  if (segments.length > 0 && segments[0].path === 'subscribers') {
    // Si la URL es 'subscribers' (1 segmento)
    if (segments.length === 1) {
      return {
        consumed: segments,
        posParams: {},
      };
    }
    // Si la URL es 'subscribers/:status' (2 segmentos)
    if (segments.length === 2) {
      return {
        consumed: segments,
        posParams: {
          status: new UrlSegment(segments[1].path, {}),
        },
      };
    }
  }
  return null;
};

const subscriptionsMatcher = (segments: UrlSegment[]) => {
  if (segments.length > 0 && segments[0].path === 'subscriptions') {
    // Si la URL es 'subscribers' (1 segmento)
    if (segments.length === 1) {
      return {
        consumed: segments,
        posParams: {},
      };
    }
    // Si la URL es 'subscribers/:status' (2 segmentos)
    if (segments.length === 2) {
      return {
        consumed: segments,
        posParams: {
          status: new UrlSegment(segments[1].path, {}),
        },
      };
    }
  }
  return null;
};

export default [
  {
    path: 'profile',
    loadComponent: () => import('./setting/pages/profile-setting/profile-setting.component'),
  },
  {
    path: 'setting',
    loadComponent: () => import('./setting/pages/main-setting/main-setting.component'),
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./setting/pages/profile-setting/profile-setting.component'),
      },
      {
        path: 'account',
        loadComponent: () => import('./setting/pages/account-setting/account-setting.component'),
      },
      {
        path: 'membership',
        loadComponent: () => import('./setting/pages/membership-setting/membership-setting.component'),
      },
      {
        path: 'payment',
        loadComponent: () => import('./setting/pages/payment-setting/payment-setting.component'),
      },
      {
        path: 'notification',
        loadComponent: () => import('./setting/pages/notification-setting/notification-setting.component'),
      },
      {
        path: 'creator-onboarding',
        loadComponent: () => import('./setting/pages/creator-onboarding/creator-onboarding.component'),
      },
      //{ path: '**', redirectTo: 'account' },
    ]
  },
  // {
  //   path: 'profile',
  //   loadComponent: () => import('../admin/profile/profile.component'),
  // },
  {
    path: 'personal',
    loadComponent: () => import('./setting/pages/personal-setting/personal-setting.component'),
  },
  {
    path: 'activity',
    loadComponent: () => import('./activity/pages/list-activity/list-activity.component'),
  },
  {
    path: 'incomes',
    loadComponent: () => import('./incomes/pages/main-incomes/main-incomes.component'),
    children: [
      {
        path: ':status',
        loadComponent: () => import('./incomes/pages/list-incomes/list-incomes.component'),
      },
      { path: '**', redirectTo: 'active' },
    ]
  },
  {
    path: 'purchases/:status',
    loadComponent: () => import('./purchases/pages/list-purchases/list-purchases.component'),
    // children: [
    //   {
    //     path: ':status',
    //     loadComponent: () => import('./purchases/pages/list-purchases/list-purchases.component'),
    //   },
    //   { path: '**', redirectTo: 'active' },
    // ]
  },
  {
    path: 'bookmarks',
    loadComponent: () => import('./bookmarks/pages/posts-bookmarks/posts-bookmarks.component'),
    children: [
      {
        path: 'posts/pu/:slug',
        loadComponent: () => import('../../layout/post/pages/details-post/details-post.component'),
      },
    ]
  },
  {
    path: 'community',
    loadComponent: () => import('./community/main-community/main-community.component'),
    children: [
      {
        matcher: subscriptionsMatcher,
        loadComponent: () => import('./community/subscriptions/pages/list-subscriptions/list-subscriptions.component'),
      },
      {
        matcher: subscribersMatcher,
        loadComponent: () => import('./community/subscribers/pages/list-subscribers/list-subscribers.component'),
      },

      { path: '**', redirectTo: 'subscriptions' },
    ]
  },
  {
    matcher: subscribersMatcher,
    loadComponent: () => import('./subscribers/pages/list-subscribers/list-subscribers.component'),
  },

  {
    path: 'ads',
    loadComponent: () => import('./ads/pages/list-ads/list-ads.component'),
  },

  // {
  //   path: 'subscribers',
  //   loadComponent: () => import('./subscribers/pages/main-subscribers/main-subscribers.component'),
  //   children: [
  //     {
  //       path: '',
  //       loadComponent: () => import('./subscribers/pages/list-subscribers/list-subscribers.component'),
  //     },
  //     {
  //       path: ':status',
  //       loadComponent: () => import('./subscribers/pages/list-subscribers/list-subscribers.component'),
  //     },
  //     { path: '**', redirectTo: '' },
  //   ]
  // },
] as Routes;
