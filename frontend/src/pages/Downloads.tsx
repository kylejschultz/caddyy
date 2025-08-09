import { Download, Pulse as Activity, CheckCircle, ClockCounterClockwise as History } from '@phosphor-icons/react'
import PageHeader from '../components/PageHeader'

export default function Downloads() {
  const downloadTabs = [
    { name: 'Active', href: '/downloads', icon: Activity },
    { name: 'Completed', href: '/downloads/completed', icon: CheckCircle },
    { name: 'History', href: '/downloads/history', icon: History },
  ]

  return (
    <div>
      <PageHeader 
        title="Downloads" 
        description="Monitor your download activity"
        tabs={downloadTabs}
      />
      
      <div className="p-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Active Downloads</h2>
          <p className="text-slate-400">No active downloads.</p>
        </div>
      </div>
    </div>
  )
}
