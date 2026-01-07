'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { SignaturePad } from '@/components/ui/signature-pad'
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  PenTool,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PendingContract {
  id: string
  template_id: string
  student_id: string
  created_at: string
  template: {
    title: string
    contract_type: string
    content: string
    description: string | null
  }
  student: {
    id: string
    profile: {
      full_name: string
    }
  }
}

interface SignedContract {
  id: string
  signed_at: string
  template: {
    title: string
    contract_type: string
  }
  student: {
    id: string
    profile: {
      full_name: string
    }
  }
}

interface ContractSigningClientProps {
  pendingContracts: PendingContract[]
  signedContracts: SignedContract[]
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  liability_waiver: 'Liability Waiver',
  membership_agreement: 'Membership Agreement',
  photo_release: 'Photo/Media Release',
  code_of_conduct: 'Code of Conduct',
  medical_release: 'Medical Release',
  other: 'Other',
}

export function ContractSigningClient({
  pendingContracts: initialPending,
  signedContracts,
}: ContractSigningClientProps) {
  const [pendingContracts, setPendingContracts] = useState(initialPending)
  const [selectedContract, setSelectedContract] = useState<PendingContract | null>(null)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const openSignModal = (contract: PendingContract) => {
    setSelectedContract(contract)
    setSignatureData(null)
    setAgreedToTerms(false)
    setIsSignModalOpen(true)
  }

  const handleSign = async () => {
    if (!selectedContract || !signatureData || !agreedToTerms) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_contract_id: selectedContract.id,
          signature_data: signatureData,
          agreed_to_terms: agreedToTerms,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sign contract')
      }

      toast.success('Contract signed successfully!')
      setPendingContracts(pendingContracts.filter(c => c.id !== selectedContract.id))
      setIsSignModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign contract')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <>
      {/* Pending Contracts */}
      {pendingContracts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              Contracts Awaiting Your Signature ({pendingContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingContracts.map(contract => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 bg-white border border-amber-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{contract.template.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Badge variant="outline">
                          {CONTRACT_TYPE_LABELS[contract.template.contract_type] || contract.template.contract_type}
                        </Badge>
                        <span>for {contract.student.profile.full_name}</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => openSignModal(contract)}>
                    <PenTool className="h-4 w-4 mr-2" />
                    Review & Sign
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Pending Contracts */}
      {pendingContracts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-gray-500">You have no contracts waiting for your signature.</p>
          </CardContent>
        </Card>
      )}

      {/* Signed Contracts History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Signed Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signedContracts.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No signed contracts yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {signedContracts.map(contract => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{contract.template.title}</p>
                      <p className="text-sm text-gray-500">
                        {contract.student.profile.full_name}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    Signed {formatDate(contract.signed_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign Contract Modal */}
      <Modal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        title={selectedContract?.template.title || 'Sign Contract'}
      >
        {selectedContract && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">
                  {CONTRACT_TYPE_LABELS[selectedContract.template.contract_type]}
                </Badge>
                <span className="text-sm text-gray-500">
                  for {selectedContract.student.profile.full_name}
                </span>
              </div>
              {selectedContract.template.description && (
                <p className="text-sm text-gray-600">{selectedContract.template.description}</p>
              )}
            </div>

            {/* Contract Content */}
            <div className="max-h-64 overflow-y-auto p-4 border rounded-lg bg-white">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {selectedContract.template.content}
              </pre>
            </div>

            {/* Agreement Checkbox */}
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 rounded"
              />
              <span className="text-sm">
                I have read and understand the above contract. I agree to be bound by its terms
                and conditions. I am signing this document voluntarily and of my own free will.
              </span>
            </label>

            {/* Signature Pad */}
            <div>
              <label className="block text-sm font-medium mb-2">Your Signature</label>
              <SignaturePad
                onSignatureChange={setSignatureData}
                width={400}
                height={150}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSign}
                disabled={!signatureData || !agreedToTerms || isLoading}
                isLoading={isLoading}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Sign Contract
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
