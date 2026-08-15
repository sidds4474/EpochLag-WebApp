"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import {
  deleteMomentAction,
  leaveMomentAction,
} from "../../../../lib/moments/cache";
import type { Moment } from "../../../../types/moment";

export default function DeleteMomentModal({
  moment,
  onClose,
  onDeleted,
}: {
  moment: Moment | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  useEffect(() => {
    if (!moment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moment, onClose]);

  if (!moment) return null;

  const isParticipant = moment.role === "participant";
  const title = isParticipant ? "Leave Moment" : "Delete Moment";
  const body = isParticipant
    ? "You will stop receiving updates for this moment."
    : "This moment will be deleted permanently";
  const primaryLabel = isParticipant ? "Leave" : "Delete";

  const handleConfirm = async () => {
    try {
      if (isParticipant) {
        await leaveMomentAction(moment._id);
      } else {
        await deleteMomentAction(moment._id);
      }
      onDeleted();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : isParticipant
            ? "Couldn't leave moment"
            : "Couldn't delete moment";
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-[16px]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-moment-title"
        className="relative bg-white rounded-[25px] shadow-[0_10px_40px_rgba(0,0,0,0.20)] w-full max-w-[354px] px-[24px] py-[28px] flex flex-col items-center gap-[16px]"
      >
        <div className="flex flex-col gap-[8px] items-center text-center">
          <h2
            id="delete-moment-title"
            className="font-montserrat font-bold text-primary-blue text-[20px] leading-[24px]"
          >
            {title}
          </h2>
          <p className="font-montserrat font-medium text-primary-blue text-[16px] leading-[20px]">
            {body}
          </p>
        </div>
        <div className="flex gap-[7px] w-full">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer flex-1 bg-[#EDEDED] text-primary-blue rounded-full py-[12px] font-montserrat font-medium text-[16px] hover:brightness-95 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="cursor-pointer flex-1 bg-[#D95F3B] text-white rounded-full py-[12px] font-montserrat font-medium text-[16px] hover:brightness-[1.05] transition"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
