import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import App from './App'
import MainPage from './pages/MainPage'
import SubscribePage from './pages/SubscribePage'
import ConfirmPage from './pages/ConfirmPage'

const rootRoute = createRootRoute({
  component: App,
})

const mainRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MainPage,
})

const subscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subscribe',
  component: SubscribePage,
})

const confirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirm/$token',
  component: ConfirmPage,
})

const routeTree = rootRoute.addChildren([mainRoute, subscribeRoute, confirmRoute])

export const router = createRouter({ routeTree })
