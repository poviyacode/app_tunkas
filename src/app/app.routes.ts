import { Routes } from '@angular/router';
import { NoAuthGuard } from '@guards/no-auth.guard';
import { AuthGuard } from '@guards/auth.guard';

export const routes: Routes = [
    {
        path: 'public',
        redirectTo: '',
        pathMatch: 'full'
    },
    {
        path: 'auth',
        loadChildren: () => import('./layout/auth/auth.routes'),
    },

    {
        path: 'confirm-email',
        loadComponent: () => import('./layout/auth/pages/confirm-email-auth/confirm-email-auth.component')
    },

    {
        path: 'code-verification',
        loadComponent: () => import('./shared/code-verification/code-verification.component')
    },

    {
        path: 'verified-email',
        canActivate: [AuthGuard],
        loadComponent: () => import('./layout/auth/pages/verified-account-auth/verified-account-auth.component')
    },
    {
        path: 'notification',
        loadComponent: () => import('./layout/admin/setting/pages/notification-setting/notification-setting.component')
    },
    {
        path: 'token-login',
        loadComponent: () => import('./layout/auth/pages/token-auth/token-auth.component'),
    },
    {
        path: '',
        loadComponent: () => import('./shared/sidebar/sidebar.component'),
        children: [
            {
                path: '',
                loadComponent: () => import('./layout/home/pages/profiles-home/profiles-home.component'),
            },
            {
                path: 'posts',
                loadComponent: () => import('./layout/home/pages/posts-home/posts-home.component'),
                //loadComponent: () => import('./layout/tags/pages/list-tags/list-tags.component'),
                children: [
                    {
                        path: 'pu/:slug',
                        loadComponent: () =>
                            import('@layout/post/pages/details-post/details-post.component'),
                    },
                ],
            },
            {
                path: 'ads',
                loadComponent: () => import('./layout/home/pages/ads-home/ads-home.component'),
                children: [
                    {
                        path: 'pu/:slug',
                        loadComponent: () =>
                            import('@layout/post/pages/details-post/details-post.component'),
                    },
                ],
            },
            {
                path: 'chats',
                canActivate: [AuthGuard],
                loadChildren: () => import('./layout/chat/chat.routes'),
            },
            {
                path: 'lives',
                loadComponent: () => import('./layout/live/pages/users-live/users-live.component'),
            },
            {
                path: 'search',
                loadChildren: () => import('./layout/search/search.route'),
            },
            {
                path: 'pay/notification/:code_collection',
                canActivate: [AuthGuard],
                loadComponent: () => import('./layout/pay/pages/notification-pay/notification-pay.component'),
            },
            {
                path: 'admin',
                canActivate: [AuthGuard],
                loadChildren: () => import('./layout/admin/admin.routes'),
            },
            {
                path: 'tags/:tag',
                loadComponent: () => import('./layout/tags/pages/list-tags/list-tags.component'),
                children: [
                    {
                        path: 'pu/:slug',
                        loadComponent: () =>
                            import('@layout/post/pages/details-post/details-post.component'),
                    },
                ],
            },
            {
                path: 'pu/:slug',
                loadComponent: () => import('./layout/post/pages/details-post/details-post.component')
                //loadComponent: () => import('./layout/seo/seo.component'),
            },
            {
                path: 'legal',
                loadChildren: () => import('./layout/legal/legal.routes'),
            },
            {
                path: ':slug',
                loadChildren: () => import('./layout/profile/profile.routes')
            },
        ]
    },

    {
        path: 'live/:slug',
        loadComponent: () => import('./layout/profile/pages/live-profile/live-profile.component'),
    },
    {
        path: 'videocall/:liveRoomId',
        loadComponent: () => import('./layout/profile/pages/video-call-profile/video-call-profile.component'),
    },
    {
        path: '**',
        loadComponent: () => import('./shared/not-found/not-found.component')
    },

    // {
    //     path: '',
    //     loadComponent: () => import('./layout/test/a/a.component'),
    //     children: [
    //         {
    //             path: '',
    //             loadComponent: () => import('./layout/home/pages/profiles-home/profiles-home.component'),
    //         }
    //     ]
    // }
];
