'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Share2, Copy, Check, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'

interface InviteMembersCardProps {
  schoolCode: string
  schoolName: string
}

export default function InviteMembersCard({ schoolCode, schoolName }: InviteMembersCardProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteLink = `${baseUrl}/signup?code=${schoolCode}`

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'code') {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      } else {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      }
      toast.success(`${type === 'code' ? 'School code' : 'Invite link'} copied!`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Share2 className="h-5 w-5" />
          Invite Members to Join
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Share your school code or invite link with families and students so they can join <strong>{schoolName}</strong>.
        </p>

        {/* School Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">School Code</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-white border rounded-lg px-4 py-3 font-mono text-lg font-bold text-center tracking-wider">
              {schoolCode.toUpperCase()}
            </div>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(schoolCode, 'code')}
              className="px-4"
            >
              {copiedCode ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Invite Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Invite Link</label>
          <div className="flex gap-2">
            <Input
              value={inviteLink}
              readOnly
              className="flex-1 bg-white text-sm"
            />
            <Button
              variant="outline"
              onClick={() => copyToClipboard(inviteLink, 'link')}
              className="px-4"
            >
              {copiedLink ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* QR Code Toggle */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQR(!showQR)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            <QrCode className="h-4 w-4 mr-2" />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </Button>
        </div>

        {showQR && (
          <div className="flex justify-center p-4 bg-white rounded-lg border">
            {/* Using a QR code API - can be replaced with a proper library later */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`}
              alt="QR Code to join school"
              className="w-48 h-48"
            />
          </div>
        )}

        <div className="pt-2 text-xs text-gray-500">
          <strong>How it works:</strong> When members sign up using your code or link, their account will appear in your Pending Approvals for you to review.
        </div>
      </CardContent>
    </Card>
  )
}
