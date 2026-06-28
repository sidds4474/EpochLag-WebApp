type Props = {
  message: string;
  className?: string;
};

export default function FormError({ message, className }: Props) {
  return (
    <div className={`flex items-center gap-[8px] ${className || "mt-[2px]"}`}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D95F3B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="font-montserrat font-medium text-[#D95F3B] text-[14px] leading-[120%] text-left">
        {message}
      </p>
    </div>
  );
}
