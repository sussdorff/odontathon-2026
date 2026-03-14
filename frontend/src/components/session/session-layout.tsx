import { useSessionStore } from '@/stores/session-store'
import SessionPage from './session-page'
import PatientViewPage from './patient-view-page'
import SubmittedPage from './submitted-page'

export function SessionLayout() {
  const { view, setView } = useSessionStore()

  switch (view) {
    case 'session':
      return <SessionPage onNavigate={(page) => setView(page)} />
    case 'patient-view':
      return (
        <PatientViewPage
          onNavigate={(page) => setView(page === 'session' ? 'session' : 'submitted')}
        />
      )
    case 'submitted':
      return <SubmittedPage onNavigate={() => setView('session')} />
  }
}
