"use client";

type Props = {
  open: boolean;
  onCancel: () => void;
  onCreateNew: () => void;
  onAddExisting: () => void;
};

export default function AddStoryChooserModal({
  open,
  onCancel,
  onCreateNew,
  onAddExisting,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-[16px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[360px] bg-white rounded-[20px] px-[20px] pt-[20px] pb-[16px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-montserrat font-bold text-primary-blue text-[17px] text-center">
          Add a story
        </h3>
        <p className="mt-[6px] font-montserrat text-primary-blue/70 text-[13px] text-center">
          Add an existing story or create a new one for this album.
        </p>
        <div className="mt-[18px] flex flex-col gap-[10px]">
          <button
            type="button"
            onClick={onCreateNew}
            className="cursor-pointer w-full bg-primary-orange text-white font-montserrat font-semibold text-[14px] rounded-full py-[11px] hover:opacity-90 transition-opacity"
          >
            Create new story
          </button>
          <button
            type="button"
            onClick={onAddExisting}
            className="cursor-pointer w-full bg-white text-primary-blue font-montserrat font-semibold text-[14px] rounded-full py-[11px] border border-primary-blue/25 hover:bg-black/[0.03] transition-colors"
          >
            Add existing story
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer w-full text-primary-blue/60 font-montserrat text-[13px] py-[6px] hover:text-primary-blue transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
