import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:lang" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
