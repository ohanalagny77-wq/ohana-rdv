import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Booking from './pages/Booking'
import Admin from './pages/Admin'
import GoogleCallback from './pages/GoogleCallback'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/booking/:therapistId" element={<Booking />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/google-callback" element={<GoogleCallback />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
