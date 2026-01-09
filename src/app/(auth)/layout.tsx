import Link from 'next/link'
import { Swords } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Swords className="h-8 w-8 text-red-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">GrandMastersUniverse</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        {children}
      </main>
      <footer className="border-t border-gray-200 dark:border-gray-800 py-4 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} GrandMastersUniverse. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
