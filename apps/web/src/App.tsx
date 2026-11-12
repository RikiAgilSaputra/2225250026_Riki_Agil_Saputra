import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './lib/auth'
import { Home } from './pages/Home'
import { Learn } from './pages/Learn'
import { Login } from './pages/Login'
import { Modeler } from './pages/Modeler'
import { ModulePage } from './pages/ModulePage'
import { Notes } from './pages/Notes'
import { Practice } from './pages/Practice'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { Solver } from './pages/Solver'
import { Teacher } from './pages/Teacher'

export function App() {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="login-page">
        <div className="spinner" />
      </div>
    )
  if (!user) return <Login />
  const isStudent = user.role === 'student'
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={isStudent ? <Home /> : <Navigate to="/guru" replace />} />
        <Route path="belajar" element={<Learn />} />
        <Route path="belajar/:moduleId" element={<ModulePage />} />
        <Route path="latihan" element={<Practice />} />
        {/* Literasi is now part of "Belajar & Literasi"; keep old links working */}
        <Route path="literasi" element={<Navigate to="/belajar?tahap=pemodelan" replace />} />
        <Route path="pemodel" element={<Modeler />} />
        <Route path="kemajuan" element={<Progress />} />
        <Route path="catatan" element={<Notes />} />
        <Route path="soal/:attemptId" element={<Solver />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="guru" element={isStudent ? <Navigate to="/" replace /> : <Teacher />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
