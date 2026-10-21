import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import ClinicalConsole from '../features/clinical/ClinicalConsole'

// Dev-only shader playground; excluded from production builds.
const ShaderSandbox = import.meta.env.DEV ? lazy(() => import('../features/sandbox/ShaderSandbox')) : null
const ScotomaSandbox = import.meta.env.DEV ? lazy(() => import('../features/sandbox/ScotomaSandbox')) : null

function App() {
  return (
    <BrowserRouter>
      <Suspense>
        <Routes>
          <Route path="/" element={<ClinicalConsole />} />
          {ShaderSandbox && <Route path="/sandbox" element={<ShaderSandbox />} />}
          {ScotomaSandbox && <Route path="/sandbox/scotoma" element={<ScotomaSandbox />} />}
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
