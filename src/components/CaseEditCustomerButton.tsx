'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LoanApplication } from '@/types/db';
import EditCustomerInfoModal from '@/components/EditCustomerInfoModal';

interface Props {
  application: LoanApplication;
  isOpsOrAdmin: boolean;
}

export default function CaseEditCustomerButton({ application, isOpsOrAdmin }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  if (!isOpsOrAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer shrink-0"
        title="Edit customer information with mandatory audit remark"
      >
        <span>✏️</span>
        <span>Edit Customer Info</span>
      </button>

      <EditCustomerInfoModal
        application={application}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
