import Header from '@/components/layout/Header'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060f1f] via-[#0a1f44] to-[#060f1f]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
