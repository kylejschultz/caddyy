import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Movies from './pages/Movies'
import Shows from './pages/Shows'
import Downloads from './pages/Downloads'
import Settings from './pages/SettingsGeneral'
import MoviesSettings from './pages/MoviesSettings'
import ShowsSettings from './pages/ShowsSettings'
import Queue from './pages/Queue'
import History from './pages/History'
import Search from './pages/Search'
import MovieDetail from './pages/MovieDetail'
import TVShowDetail from './pages/TVShowDetail'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/shows" element={<Shows />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/downloads/completed" element={<Downloads />} />
          <Route path="/downloads/history" element={<Downloads />} />
          <Route path="/shows/add" element={<Shows />} />
          <Route path="/shows/calendar" element={<Shows />} />
          <Route path="/movies/add" element={<Movies />} />
          <Route path="/search" element={<Search />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/tv/:id" element={<TVShowDetail />} />
          <Route path="/movies/settings" element={<MoviesSettings />} />
          <Route path="/shows/settings" element={<ShowsSettings />} />
          <Route path="/monitor" element={<Navigate to="/monitor/queue" replace />} />
          <Route path="/monitor/queue" element={<Queue />} />
          <Route path="/monitor/history" element={<History />} />
          <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
          <Route path="/settings/general" element={<Settings />} />
          <Route path="/settings/users" element={<Settings />} />
          <Route path="/settings/security" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
