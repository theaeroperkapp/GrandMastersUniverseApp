'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Contract {
  id: string
  title: string
  name: string
  content: string
  contract_type: string
  is_required: boolean
}

export default function SignContractPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [alreadySigned, setAlreadySigned] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    fetchContract()
  }, [contractId])

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        toast.error(data.error || 'Contract not found')
        router.push('/notifications')
        return
      }

      setContract(data.contract as Contract)
      setAlreadySigned(data.already_signed)
    } catch (error) {
      toast.error('Failed to load contract')
      router.push('/notifications')
    } finally {
      setLoading(false)
    }
  }

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y

    if ('touches' in e) {
      e.preventDefault()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSign = async () => {
    if (!agreed) {
      toast.error('Please agree to the terms')
      return
    }

    if (!hasSignature && !signature) {
      toast.error('Please provide your signature')
      return
    }

    setSigning(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Please log in')
        return
      }

      // Get signature data from canvas or typed signature
      let signatureData = signature
      if (canvasRef.current && hasSignature) {
        signatureData = canvasRef.current.toDataURL()
      }

      const response = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contractId,
          signature_data: signatureData,
          agreed_to_terms: agreed,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign contract')
      }

      toast.success('Contract signed successfully!')
      router.push('/notifications')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign contract')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (alreadySigned) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Already Signed</h2>
            <p className="text-gray-600 mb-6">
              You have already signed this contract.
            </p>
            <Button onClick={() => router.push('/notifications')}>
              Back to Notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Contract Not Found</h2>
            <p className="text-gray-600 mb-6">
              This contract could not be found or has been removed.
            </p>
            <Button onClick={() => router.push('/notifications')}>
              Back to Notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sign Contract</h1>
        <p className="text-gray-600">Please review and sign the contract below</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-gray-500" />
            <div>
              <CardTitle>{contract.title || contract.name}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{contract.contract_type?.replace('_', ' ')}</Badge>
                {contract.is_required && (
                  <Badge className="bg-red-100 text-red-700">Required</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
              {contract.content}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Signature Canvas */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Draw your signature below:</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={clearSignature}
            >
              Clear Signature
            </Button>
          </div>

          <div className="text-center text-gray-400 text-sm">- OR -</div>

          {/* Typed Signature */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Type your full name as signature:</p>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name"
              className="w-full px-4 py-3 border rounded-lg text-xl font-cursive focus:outline-none focus:ring-2 focus:ring-red-500"
              style={{ fontFamily: 'cursive' }}
            />
          </div>

          {/* Agreement Checkbox */}
          <div className="pt-4 border-t">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 rounded"
              />
              <span className="text-sm text-gray-700">
                I have read and understood the above contract. I agree to be bound by its terms and conditions.
                I confirm that I am authorized to sign this document.
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push('/notifications')}>
          Cancel
        </Button>
        <Button
          onClick={handleSign}
          disabled={!agreed || (!hasSignature && !signature) || signing}
          isLoading={signing}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Sign Contract
        </Button>
      </div>
    </div>
  )
}
