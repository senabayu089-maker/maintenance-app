
import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '../stores/auth';

import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import ForbiddenView from '../views/ForbiddenView.vue';
import MainLayout from '../layouts/MainLayout.vue';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      guestOnly: true,
    },
  },

  {
    path: '/',
    component: MainLayout,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardView,
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/DashboardView.vue'),
        meta: {
          roles: ['ADMIN'],
        },
      },
      {
        path: 'maintenance',
        name: 'maintenance',
        component: () => import('../views/MaintenanceView.vue'),
        meta: {
          roles: ['ADMIN', 'TECHNICIAN'],
        },
      },
      {
        path: 'schedules',
        name: 'schedules',
        component: () => import('../views/SchedulesView.vue'),
      },
      
      {
        path: 'annual-schedules',
        name: 'annual-schedules',
        component: () => import('../views/AnnualScheduleView.vue'),
      },

      {
        path: 'assets',
        name: 'assets',
        component: () => import('../views/AssetsView.vue'),
      },
      {
        path: 'asset-categories',
        name: 'asset-categories',
        component: () => import('../views/AssetCategoriesView.vue'),
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('../views/ReportsView.vue'),
        meta: {
          roles: ['ADMIN', 'TECHNICIAN'],
        },
      },
      {
        path: 'forbidden',
        name: 'forbidden',
        component: ForbiddenView,
      },
    ],
  },

  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!auth.initialized) {
    await auth.fetchUser();
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return {
      name: 'dashboard',
    };
  }

  const matchedRoles = to.matched.flatMap(
    (record) => record.meta.roles || [],
  );

  if (
    matchedRoles.length > 0 &&
    !matchedRoles.includes(auth.userRole)
  ) {
    return {
      name: 'forbidden',
    };
  }

  return true;
});

export default router;
