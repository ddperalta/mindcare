import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import type { AppointmentRequest } from '../../types';

interface RequestListProps {
  requests: AppointmentRequest[];
  patientNames: Map<string, string>;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string, responseNote: string) => Promise<void>;
}

export function RequestList({ requests, patientNames, onApprove, onReject }: RequestListProps) {
  const { t } = useTranslation();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  if (pendingRequests.length === 0) return null;

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await onApprove(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await onReject(id, responseNote);
      setRejectingId(null);
      setResponseNote('');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDateTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate?.() || new Date(ts);
    return d.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-coral-50 border border-coral-200 rounded-xl p-4 mb-6">
      <h3 className="text-lg font-semibold text-coral-800 mb-4">
        {t('appointments.requests.title')} ({pendingRequests.length})
      </h3>

      <div className="space-y-3">
        {pendingRequests.map((req) => (
          <div
            key={req.id}
            className="bg-white border border-coral-100 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sage-900">
                  {patientNames.get(req.patientId) || req.patientId}
                </p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                  req.type === 'MODIFICATION'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-coral-100 text-coral-800'
                }`}>
                  {t(`appointments.requests.${req.type.toLowerCase()}`)}
                </span>
              </div>
              <span className="text-xs text-sage-500">{formatDateTime(req.createdAt)}</span>
            </div>

            <p className="text-sm text-sage-700 mb-2">{req.reason}</p>

            {req.type === 'MODIFICATION' && req.proposedStart && (
              <p className="text-sm text-teal-700 mb-2">
                {t('appointments.requests.proposedTime')}: {formatDateTime(req.proposedStart)}
              </p>
            )}

            {rejectingId === req.id ? (
              <div className="space-y-2 mt-3">
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder={t('appointments.requests.responseNotePlaceholder')}
                  className="input-field text-sm min-h-[60px]"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => { setRejectingId(null); setResponseNote(''); }}
                    className="text-sm"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleReject(req.id)}
                    isLoading={processingId === req.id}
                    className="text-sm"
                  >
                    {t('appointments.requests.reject')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="secondary"
                  onClick={() => handleApprove(req.id)}
                  isLoading={processingId === req.id}
                  className="text-sm"
                >
                  {t('appointments.requests.approve')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setRejectingId(req.id)}
                  className="text-sm text-coral-600 hover:bg-coral-50"
                >
                  {t('appointments.requests.reject')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
