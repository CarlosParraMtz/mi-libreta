import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { EntryModal } from './components/EntryModal'
import { Toast } from './components/Toast'
import { ModuleGate } from './components/ModuleGate'
import { AdminGate } from './components/AdminGate'
import { AdminClaimSync } from './components/AdminClaimSync'
import { Cash } from './pages/Cash'
import { CreditDetail } from './pages/CreditDetail'
import { Credits } from './pages/Credits'
import { Dashboard } from './pages/Dashboard'
import { Layaways } from './pages/Layaways'
import { Landing } from './pages/Landing'
import { Customers } from './pages/Customers'
import { Orders } from './pages/Orders'
import { AcceptInvitation } from './pages/AcceptInvitation'
import { Admin } from './pages/Admin'
import { AdminBusiness } from './pages/AdminBusiness'
import './App.css'

const FirebaseSync = lazy(() => import('./components/FirebaseSync').then((module) => ({ default: module.FirebaseSync })))
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })))
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((module) => ({ default: module.ForgotPassword })))
const Onboarding = lazy(() => import('./pages/Onboarding').then((module) => ({ default: module.Onboarding })))
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })))
const RequireAuth = lazy(() => import('./components/RequireAuth').then((module) => ({ default: module.RequireAuth })))

function App() {
  return (
    <>
      <Suspense fallback={null}><FirebaseSync /></Suspense>
      <AdminClaimSync />
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Abriendo tu libreta…</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/iniciar-sesion" element={<Login />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/recuperar-contrasena" element={<ForgotPassword />} />
          <Route element={<RequireAuth requireOnboarding />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
          <Route element={<RequireAuth ignoreOnboarding />}>
            <Route path="/aceptar-invitacion" element={<AcceptInvitation />} />
            <Route element={<AdminGate />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/libretas/:id" element={<AdminBusiness />} />
            </Route>
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="fiados" element={<ModuleGate module="credits"><Credits /></ModuleGate>} />
              <Route path="fiados/:id" element={<ModuleGate module="credits"><CreditDetail /></ModuleGate>} />
              <Route path="apartados" element={<ModuleGate module="layaways"><Layaways /></ModuleGate>} />
              <Route path="caja" element={<ModuleGate module="cash"><Cash /></ModuleGate>} />
              <Route path="pedidos" element={<ModuleGate module="orders"><Orders /></ModuleGate>} />
              <Route path="clientes" element={<Customers />} />
              <Route path="configuracion" element={<Settings />} />
            </Route>
            <Route path="/app" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
      <EntryModal />
      <Toast />
    </>
  )
}

export default App
