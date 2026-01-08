'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  CreditCard,
  Bell,
  Award,
  QrCode,
  MessageSquare,
  Settings,
  Mail,
} from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSection {
  title: string
  icon: React.ReactNode
  items: FAQItem[]
}

const faqSections: FAQSection[] = [
  {
    title: 'Getting Started',
    icon: <HelpCircle className="h-5 w-5" />,
    items: [
      {
        question: 'How do I create an account?',
        answer: 'To create an account, click the "Sign Up" button on the login page. Select whether you are a Student or Parent, fill in your details, and select your school. Your account will need to be approved by the school administrator before you can access all features.',
      },
      {
        question: 'How long does account approval take?',
        answer: 'Account approval typically takes 1-2 business days. You will receive an email notification once your account has been approved. If you haven\'t heard back after a few days, please contact your school directly.',
      },
      {
        question: 'I forgot my password. How do I reset it?',
        answer: 'Click "Forgot Password" on the login page and enter your email address. You will receive an email with a link to reset your password. The link expires after 1 hour.',
      },
    ],
  },
  {
    title: 'Classes & Schedule',
    icon: <Calendar className="h-5 w-5" />,
    items: [
      {
        question: 'How do I view my class schedule?',
        answer: 'Go to "My Classes" from the main menu to see all classes you\'re enrolled in. The schedule shows class times, instructors, and locations.',
      },
      {
        question: 'How do I register for a class?',
        answer: 'Visit the "Schedule" page to see all available classes. Click on a class to view details and register. Some classes may have prerequisites or capacity limits.',
      },
      {
        question: 'Can I cancel a class registration?',
        answer: 'Yes, you can cancel your registration by going to "My Classes" and clicking the cancel button next to the class. Please note that some classes may have cancellation deadlines.',
      },
    ],
  },
  {
    title: 'Attendance & Check-in',
    icon: <QrCode className="h-5 w-5" />,
    items: [
      {
        question: 'How do I check in to class?',
        answer: 'There are multiple ways to check in: 1) Scan the QR code displayed at your school using your phone, 2) Enter your PIN code at the check-in kiosk, or 3) Your instructor can manually check you in.',
      },
      {
        question: 'What is my PIN code?',
        answer: 'Your PIN code is a unique 4-6 digit number assigned to you for quick check-in. You can find your PIN in your profile settings or ask your school administrator.',
      },
      {
        question: 'How do I view my attendance history?',
        answer: 'Go to "My Progress" to see your complete attendance history, including dates, classes attended, and total check-ins.',
      },
    ],
  },
  {
    title: 'Belt Ranks & Progress',
    icon: <Award className="h-5 w-5" />,
    items: [
      {
        question: 'How do I see my current belt rank?',
        answer: 'Your current belt rank is displayed on your profile and in the "My Progress" section. You can also see your rank history and promotion dates.',
      },
      {
        question: 'How are belt promotions determined?',
        answer: 'Belt promotions are determined by your instructor based on factors like attendance, skill level, time at current rank, and belt testing performance. Each school may have different requirements.',
      },
      {
        question: 'When is the next belt testing?',
        answer: 'Belt testing dates are announced through school announcements and the Events page. Make sure to enable notifications to stay updated.',
      },
    ],
  },
  {
    title: 'Family & Account',
    icon: <Users className="h-5 w-5" />,
    items: [
      {
        question: 'How do I add family members?',
        answer: 'Go to "My Family" to view your family account. Contact your school administrator to add additional family members to your account.',
      },
      {
        question: 'How do I update my profile information?',
        answer: 'Go to "Settings" from the menu to update your name, email, profile picture, and other account information.',
      },
      {
        question: 'Can multiple family members use the same account?',
        answer: 'Each person should have their own account for accurate attendance tracking. However, family accounts are linked together for billing purposes.',
      },
    ],
  },
  {
    title: 'Payments & Billing',
    icon: <CreditCard className="h-5 w-5" />,
    items: [
      {
        question: 'How do I view my payment history?',
        answer: 'Go to the "Payments" page to see all your transactions, including membership fees, event registrations, and any custom charges.',
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and debit cards. Payment processing is handled securely through Stripe.',
      },
      {
        question: 'How do I update my payment method?',
        answer: 'Contact your school administrator to update your payment method on file. For security reasons, payment information can only be updated through the school.',
      },
    ],
  },
  {
    title: 'Notifications',
    icon: <Bell className="h-5 w-5" />,
    items: [
      {
        question: 'How do I manage my notifications?',
        answer: 'Go to "Settings" and find the Notifications section to customize which notifications you receive and how you receive them.',
      },
      {
        question: 'Why am I not receiving email notifications?',
        answer: 'Check your spam folder first. Make sure your email address is correct in your profile settings. You can also check your notification preferences in Settings.',
      },
    ],
  },
  {
    title: 'Events',
    icon: <Calendar className="h-5 w-5" />,
    items: [
      {
        question: 'How do I register for an event?',
        answer: 'Go to the "Events" page to see upcoming events. Click on an event to view details and register. Some events may require payment at registration.',
      },
      {
        question: 'Can I get a refund for an event?',
        answer: 'Refund policies vary by event. Check the event details or contact your school administrator for specific refund policies.',
      },
    ],
  },
  {
    title: 'Contact & Support',
    icon: <Mail className="h-5 w-5" />,
    items: [
      {
        question: 'How do I contact my school?',
        answer: 'You can send a message to your school through the "Messages" feature, or find contact information in the school announcements or your school\'s website.',
      },
      {
        question: 'I found a bug or have a feature request. How do I report it?',
        answer: 'Please contact your school administrator with any technical issues or feature requests. They can escalate issues to the platform support team.',
      },
    ],
  },
]

export default function HelpPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>([faqSections[0].title])
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([])

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  const toggleQuestion = (question: string) => {
    setExpandedQuestions(prev =>
      prev.includes(question)
        ? prev.filter(q => q !== question)
        : [...prev, question]
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Help & FAQ
        </h1>
        <p className="text-gray-500 text-sm">Find answers to common questions</p>
      </div>

      {/* Quick Links */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {faqSections.map(section => (
              <button
                key={section.title}
                onClick={() => {
                  toggleSection(section.title)
                  document.getElementById(section.title)?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
              >
                {section.icon}
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Sections */}
      <div className="space-y-4">
        {faqSections.map(section => (
          <Card key={section.title} id={section.title}>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection(section.title)}
            >
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {section.icon}
                  {section.title}
                </span>
                {expandedSections.includes(section.title) ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.includes(section.title) && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {section.items.map(item => (
                    <div
                      key={item.question}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                        onClick={() => toggleQuestion(item.question)}
                      >
                        <span className="font-medium text-sm">{item.question}</span>
                        {expandedQuestions.includes(item.question) ? (
                          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {expandedQuestions.includes(item.question) && (
                        <div className="px-3 pb-3 text-sm text-gray-600 bg-gray-50">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Contact Section */}
      <Card className="mt-6">
        <CardContent className="p-6 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h3 className="font-semibold mb-2">Still need help?</h3>
          <p className="text-gray-500 text-sm mb-4">
            Can't find what you're looking for? Contact your school directly for personalized assistance.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="/messages"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Send Message
            </a>
            <a
              href="/announcements"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Bell className="h-4 w-4" />
              View Announcements
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
