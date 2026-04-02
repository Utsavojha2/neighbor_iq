import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import App from './App'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'

const rootRoute = createRootRoute({
  component: App,
})

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const mainRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analyze',
  component: MainPage,
})

const routeTree = rootRoute.addChildren([landingRoute, mainRoute])

export const router = createRouter({ routeTree })
