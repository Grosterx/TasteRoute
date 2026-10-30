import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const FunHub = lazy(() => import('./pages/FunHub').then((m) => ({ default: m.FunHub })))
const ShawarmaQuiz = lazy(() => import('./pages/ShawarmaQuiz').then((m) => ({ default: m.ShawarmaQuiz })))
const BunHoroscope = lazy(() => import('./pages/BunHoroscope').then((m) => ({ default: m.BunHoroscope })))
const CreateRoom = lazy(() => import('./pages/CreateRoom').then((m) => ({ default: m.CreateRoom })))
const JoinRoom = lazy(() => import('./pages/JoinRoom').then((m) => ({ default: m.JoinRoom })))
const Lobby = lazy(() => import('./pages/Lobby').then((m) => ({ default: m.Lobby })))
const Swipes = lazy(() => import('./pages/Swipes').then((m) => ({ default: m.Swipes })))
const RoutePage = lazy(() => import('./pages/RoutePage').then((m) => ({ default: m.RoutePage })))
const RoomBooking = lazy(() => import('./pages/RoomBooking').then((m) => ({ default: m.RoomBooking })))
const BusinessLanding = lazy(() =>
  import('./pages/BusinessLanding').then((m) => ({ default: m.BusinessLanding })),
)
const Places = lazy(() => import('./pages/Places').then((m) => ({ default: m.Places })))
const Place = lazy(() => import('./pages/Place').then((m) => ({ default: m.Place })))
const RestaurantLogin = lazy(() =>
  import('./pages/RestaurantLogin').then((m) => ({ default: m.RestaurantLogin })),
)
const RestaurantShell = lazy(() =>
  import('./pages/RestaurantShell').then((m) => ({ default: m.RestaurantShell })),
)
const RestaurantOverview = lazy(() =>
  import('./pages/RestaurantOverview').then((m) => ({ default: m.RestaurantOverview })),
)
const RestaurantBookings = lazy(() =>
  import('./pages/RestaurantBookings').then((m) => ({ default: m.RestaurantBookings })),
)
const RestaurantMenu = lazy(() =>
  import('./pages/RestaurantMenu').then((m) => ({ default: m.RestaurantMenu })),
)
const RestaurantAnalytics = lazy(() =>
  import('./pages/RestaurantAnalytics').then((m) => ({ default: m.RestaurantAnalytics })),
)
const RestaurantQR = lazy(() => import('./pages/RestaurantQR').then((m) => ({ default: m.RestaurantQR })))
const RestaurantProfile = lazy(() =>
  import('./pages/RestaurantProfile').then((m) => ({ default: m.RestaurantProfile })),
)
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const AdminB2B = lazy(() => import('./pages/AdminB2B').then((m) => ({ default: m.AdminB2B })))
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-sm text-cream-300/60">
      Загрузка…
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/fun" element={<FunHub />} />
            <Route path="/fun/shawarma" element={<ShawarmaQuiz />} />
            <Route path="/fun/horoscope" element={<BunHoroscope />} />
            <Route path="/create" element={<CreateRoom />} />
            <Route path="/r/:code" element={<JoinRoom />} />
            <Route path="/room/:code" element={<Lobby />} />
            <Route path="/room/:code/swipes" element={<Swipes />} />
            <Route path="/room/:code/route" element={<RoutePage />} />
            <Route path="/room/:code/booking" element={<RoomBooking />} />
            <Route path="/for-restaurants" element={<BusinessLanding />} />
            <Route path="/places" element={<Places />} />
            <Route path="/places/:slug" element={<Place />} />
            <Route path="/restaurant/login" element={<RestaurantLogin />} />
            <Route path="/restaurant" element={<RestaurantShell />}>
              <Route index element={<RestaurantOverview />} />
              <Route path="bookings" element={<RestaurantBookings />} />
              <Route path="menu" element={<RestaurantMenu />} />
              <Route path="analytics" element={<RestaurantAnalytics />} />
              <Route path="qr" element={<RestaurantQR />} />
              <Route path="profile" element={<RestaurantProfile />} />
            </Route>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/b2b" element={<AdminB2B />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
