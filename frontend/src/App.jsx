import { useState, useEffect } from 'react'
import Nav from './components/Nav.jsx'
import Search from './views/Search.jsx'
import Verify from './views/Verify.jsx'
import Outline from './views/Outline.jsx'

function getViewFromHash() {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'verify') return 'verify'
  if (hash === 'outline') return 'outline'
  return 'search'
}

export default function App() {
  const [view, setView] = useState(getViewFromHash)

  useEffect(() => {
    function onHashChange() {
      setView(getViewFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    // Set default hash if none
    if (!window.location.hash) {
      window.location.hash = '#search'
    }
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigate(v) {
    window.location.hash = '#' + v
    setView(v)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav active={view} onNavigate={navigate} />
      <main style={{ paddingTop: 64, flex: 1 }}>
        {view === 'search' && <Search />}
        {view === 'verify' && <Verify />}
        {view === 'outline' && <Outline />}
      </main>
    </div>
  )
}
