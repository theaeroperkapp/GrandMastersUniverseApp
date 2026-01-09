import Link from 'next/link'
import { Swords, Users, Calendar, Award, CreditCard, Bell, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const features = [
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Family Management',
      description: 'Manage entire families with consolidated billing. Parents handle payments for minors, students 16+ can manage their own accounts.',
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: 'Belt Rank Tracking',
      description: 'Track student progress with customizable belt systems. Record promotions and celebrate achievements.',
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: 'Class Scheduling',
      description: 'Create and manage class schedules. Students can enroll in classes that match their belt level.',
    },
    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: 'Attendance Tracking',
      description: 'Multiple check-in options: QR codes, PIN codes, or manual check-in by instructors.',
    },
    {
      icon: <Bell className="h-8 w-8" />,
      title: 'Events & Tournaments',
      description: 'Organize seminars, belt testing, tournaments, and social events with integrated registration and payments.',
    },
    {
      icon: <CreditCard className="h-8 w-8" />,
      title: 'Billing & Payments',
      description: 'Automated tuition billing, custom charges, and family discounts. Accept payments securely via Stripe.',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Swords className="h-8 w-8 text-red-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">GrandMastersUniverse</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-red-50 to-white dark:from-gray-900 dark:to-gray-950 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-gray-900 dark:text-white">
            Manage Your Martial Arts School<br />
            <span className="text-red-600">Like a Grandmaster</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            The complete platform for martial arts schools. Manage students, families, classes, events, and billing all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline">Learn More</Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            30-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">
            Everything You Need to Run Your School
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-center max-w-2xl mx-auto mb-12">
            From student enrollment to belt promotions, we've got you covered.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow"
              >
                <div className="text-red-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Simple, Transparent Pricing</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-12">One plan, everything included.</p>

          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 p-8">
            <div className="text-red-600 font-semibold mb-2">SCHOOL PLAN</div>
            <div className="text-5xl font-bold mb-2 text-gray-900 dark:text-white">
              $99<span className="text-xl text-gray-500 dark:text-gray-400">/month</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">per school</p>

            <ul className="text-left space-y-3 mb-8">
              {[
                'Unlimited students & families',
                'Class scheduling & attendance',
                'Belt rank management',
                'Events & registrations',
                'Billing & payments',
                'Announcements & feed',
                'Custom subdomain',
                'Contracts & waivers',
                'Email support',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/signup">
              <Button className="w-full" size="lg">
                Start 30-Day Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your School?
          </h2>
          <p className="text-red-100 mb-8 max-w-xl mx-auto">
            Join martial arts schools around the world using GrandMastersUniverse to manage their students and grow their business.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <Swords className="h-6 w-6" />
                <span className="font-bold">GrandMastersUniverse</span>
              </div>
              <p className="text-sm">
                The complete management platform for martial arts schools.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/owners" className="hover:text-white">For School Owners</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/waitlist" className="hover:text-white">Join Waitlist</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            &copy; {new Date().getFullYear()} GrandMastersUniverse. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
