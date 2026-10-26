import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Admin } from './pages/Admin'
import { BunHoroscope } from './pages/BunHoroscope'
import { CreateRoom } from './pages/CreateRoom'
import { FunHub } from './pages/FunHub'
import { Home } from './pages/Home'
import { JoinRoom } from './pages/JoinRoom'
import { Lobby } from './pages/Lobby'
import { NotFound } from './pages/NotFound'
import { RoutePage } from './pages/RoutePage'
import { ShawarmaQuiz } from './pages/ShawarmaQuiz'
import { Swipes } from './pages/Swipes'

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
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
