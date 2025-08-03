import PageHeader from '../components/PageHeader'

export default function Dashboard() {
  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        description="Welcome to Caddyy - Your next-gen media automation platform"
      />
      
      <div className="p-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-slate-300">API Server Online</span>
          </div>
        </div>
      </div>
    </div>
  )
}
