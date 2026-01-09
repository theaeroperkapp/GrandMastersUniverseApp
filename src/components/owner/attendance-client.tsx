'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { NumericKeypad } from '@/components/ui/numeric-keypad'
import {
  QrCode,
  Keyboard,
  UserCheck,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  Search,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ClassSchedule {
  id: string
  name: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface ClassSession {
  id: string
  class_schedule_id: string
  date: string
  status: string
  class_schedule: {
    name: string
  } | null
}

interface Student {
  id: string
  full_name: string
  avatar_url: string | null
}

interface AttendanceRecord {
  id: string
  check_in_time: string
  check_in_method: string
  student: {
    id: string
    profile: {
      full_name: string
    }
  }
  class_session: {
    id: string
    class_schedule: {
      name: string
    }
  } | null
}

interface AttendanceClientProps {
  classes: ClassSchedule[]
  sessions: ClassSession[]
  students: Student[]
  recentAttendance: AttendanceRecord[]
  schoolId: string
}

export function AttendanceClient({
  classes,
  sessions,
  students,
  recentAttendance: initialAttendance,
  schoolId,
}: AttendanceClientProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'pin' | 'qr'>('manual')
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recentAttendance, setRecentAttendance] = useState(initialAttendance)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null)
  const pinInputRef = useRef<HTMLInputElement>(null)

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle manual check-in
  const handleManualCheckIn = async (studentId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          student_id: studentId,
          class_session_id: selectedSession || null,
          check_in_method: 'manual',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check in')
      }

      const studentName = students.find(s => s.id === studentId)?.full_name
      setLastCheckedIn(studentName || 'Student')
      setShowSuccessModal(true)

      // Add to recent attendance
      setRecentAttendance([data, ...recentAttendance.slice(0, 49)])
      toast.success(`${studentName} checked in successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Check-in failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle PIN check-in
  const handlePinCheckIn = async () => {
    if (pinCode.length < 4) {
      toast.error('Please enter a valid PIN')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          method: 'pin',
          code: pinCode,
          class_session_id: selectedSession || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid PIN')
      }

      const studentName = data.record?.student?.profile?.full_name || 'Student'
      setLastCheckedIn(studentName)
      setShowSuccessModal(true)
      setPinCode('')

      // Add to recent attendance
      if (data.record) {
        setRecentAttendance([data.record, ...recentAttendance.slice(0, 49)])
      }
      toast.success(`${studentName} checked in successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Check-in failed')
      setPinCode('')
    } finally {
      setIsLoading(false)
      pinInputRef.current?.focus()
    }
  }

  // Handle QR code scan (simulated - would need camera integration)
  const handleQrScan = async (code: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          method: 'qr',
          code: code,
          class_session_id: selectedSession || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid QR code')
      }

      const studentName = data.record?.student?.profile?.full_name || 'Student'
      setLastCheckedIn(studentName)
      setShowSuccessModal(true)

      if (data.record) {
        setRecentAttendance([data.record, ...recentAttendance.slice(0, 49)])
      }
      toast.success(`${studentName} checked in successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Check-in failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-focus PIN input when tab changes
  useEffect(() => {
    if (activeTab === 'pin') {
      pinInputRef.current?.focus()
    }
  }, [activeTab])

  // Handle PIN input keypress
  const handlePinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pinCode.length >= 4) {
      handlePinCheckIn()
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'pin':
        return <Badge variant="secondary">PIN</Badge>
      case 'qr':
        return <Badge variant="secondary">QR</Badge>
      case 'manual':
        return <Badge variant="outline">Manual</Badge>
      default:
        return <Badge variant="outline">{method}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Session Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Class Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="session">Today&apos;s Sessions</Label>
            <select
              id="session"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">General Check-in (No specific class)</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.class_schedule?.name || 'Class'} - {new Date(session.date).toLocaleDateString()}
                </option>
              ))}
            </select>
            {sessions.length === 0 && (
              <p className="text-sm text-gray-500">No class sessions scheduled for today</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check-in Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Check-in Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tab Buttons - Premium */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'manual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span>
            </button>
            <button
              onClick={() => setActiveTab('pin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'pin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">PIN</span>
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'qr'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          </div>

          {/* Manual Check-in Tab */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredStudents.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No students found</p>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt={student.full_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {student.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleManualCheckIn(student.id)}
                        disabled={isLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Check In
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PIN Check-in Tab - Premium Keypad */}
          {activeTab === 'pin' && (
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-center">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                  <Keyboard className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Enter Your PIN</h3>
                <p className="text-gray-500 text-sm">Use the keypad below to check in</p>
              </div>

              <NumericKeypad
                value={pinCode}
                onChange={setPinCode}
                onSubmit={handlePinCheckIn}
                maxLength={4}
                error={false}
              />

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Checking in...</span>
                </div>
              )}
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-center">
                <QrCode className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Scan your student QR code</p>
              </div>

              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center p-6">
                  <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Camera preview would appear here</p>
                  <p className="text-xs text-gray-400 mt-2">QR scanner requires camera access</p>
                </div>
              </div>

              {/* Manual QR code entry for testing */}
              <div className="space-y-2">
                <Label>Or enter student ID manually:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Student ID from QR code"
                    id="qr-manual"
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById('qr-manual') as HTMLInputElement
                      if (input?.value) {
                        handleQrScan(input.value)
                        input.value = ''
                      }
                    }}
                    disabled={isLoading}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No check-ins recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{record.student?.profile?.full_name}</p>
                      <p className="text-sm text-gray-500">
                        {record.class_session?.class_schedule?.name || 'General Check-in'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getMethodBadge(record.check_in_method)}
                    <span className="text-sm text-gray-500">
                      {formatTime(record.check_in_time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Modal - Premium */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title=""
      >
        <div className="text-center py-8">
          {/* Animated Success Icon */}
          <div className="relative mx-auto mb-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200 animate-badge-bounce">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path className="animate-check" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {/* Sparkles */}
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-1 h-4 w-4 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {lastCheckedIn}!
          </h3>
          <p className="text-gray-500 mb-6">You have been checked in successfully.</p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full text-green-700 text-sm font-medium">
            <Clock className="h-4 w-4" />
            {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={() => setShowSuccessModal(false)}
            className="btn-gradient-green text-white px-8 shadow-lg shadow-green-200"
          >
            Have a great class!
          </Button>
        </div>
      </Modal>
    </div>
  )
}
