import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Movies from './pages/Movies'
import Shows from './pages/Shows'
import Downloads from './pages/Downloads'
import SettingsGeneral from './pages/SettingsGeneral'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/shows" element={<Shows />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
          <Route path="/settings/general" element={<SettingsGeneral />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
