import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import App from './App'
import MainPage from './pages/MainPage'
import SubscribePage from './pages/SubscribePage'

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

const routeTree = rootRoute.addChildren([mainRoute, subscribeRoute])

export const router = createRouter({ routeTree })
