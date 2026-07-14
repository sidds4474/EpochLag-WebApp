import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12.4004 2C13.5082 2.00015 14.5106 2.6228 16.5156 3.86719L18.5156 5.1084C20.4125 6.28565 21.3616 6.87393 21.8809 7.82227C22.4001 8.7708 22.4004 9.91567 22.4004 12.2041V13.7246C22.4004 17.6254 22.4 19.5762 21.2285 20.7881C20.057 21.9999 18.1714 22 14.4004 22H10.4004C6.62915 22 4.74286 21.9999 3.57129 20.7881C2.39988 19.5762 2.40039 17.6253 2.40039 13.7246V12.2041C2.40039 9.91567 2.39974 8.7708 2.91895 7.82227C3.43818 6.87389 4.38727 6.28567 6.28418 5.1084L8.28418 3.86719C10.2895 2.62261 11.2925 2 12.4004 2Z"
        fill="currentColor"
      />
      <rect x="8.8" y="16.7998" width="7.2" height="1.6" rx="0.8" fill="white" />
    </svg>
  );
}

export function InteractionsIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15.5 0C17.9853 0 20 2.01472 20 4.5C20 6.98528 17.9853 9 15.5 9H12.5C12.1513 9 11.9769 9 11.8338 8.96167C11.4456 8.85764 11.1424 8.5544 11.0383 8.16617C11 8.02311 11 7.84874 11 7.5V4.5C11 2.01472 13.0147 0 15.5 0Z"
        fill="currentColor"
      />
      <path
        d="M7.5 11C7.84874 11 8.02311 11 8.16617 11.0383C8.5544 11.1424 8.85764 11.4456 8.96167 11.8338C9 11.9769 9 12.1513 9 12.5V15.5C9 17.9853 6.98528 20 4.5 20C2.01472 20 0 17.9853 0 15.5C0 13.0147 2.01472 11 4.5 11H7.5Z"
        fill="currentColor"
      />
      <path
        d="M4.5 0C6.98528 0 9 2.01472 9 4.5V7.2C9 7.83006 9 8.14509 8.87738 8.38574C8.76952 8.59742 8.59742 8.76952 8.38574 8.87738C8.14509 9 7.83006 9 7.2 9H4.5C2.01472 9 0 6.98528 0 4.5C0 2.01472 2.01472 0 4.5 0Z"
        fill="currentColor"
      />
      <path
        d="M15.5 11C17.9853 11 20 13.0147 20 15.5C20 17.9853 17.9853 20 15.5 20C13.0147 20 11 17.9853 11 15.5V12.2857C11 12.1365 11 12.0618 11.0071 11.999C11.0658 11.4775 11.4775 11.0658 11.999 11.0071C12.0618 11 12.1365 11 12.2857 11H15.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LibraryIcon(props: IconProps) {
  return (
    <svg
      width={22}
      height={19}
      viewBox="0 0 22 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2.18066 0.0617483C3.2546 0.124758 4.52491 0.248761 5.5 0.494366C6.65407 0.785075 8.02565 1.40488 9.11035 1.95237C9.44807 2.12281 9.80727 2.24119 10.1748 2.30784V18.2453C9.84155 18.1752 9.516 18.0617 9.20898 17.9055C8.10967 17.3462 6.68941 16.6973 5.5 16.3977C4.53564 16.1548 3.28216 16.0307 2.21582 15.967C0.996302 15.894 0 14.9498 0 13.7834V2.0803C0.000245482 0.927438 0.97512 -0.00896956 2.18066 0.0617483ZM19.8896 0.00120146C21.0685 -0.0379926 21.9999 0.886962 22 2.01292V13.7834C22 14.9499 21.0029 15.8942 19.7832 15.967C18.717 16.0307 17.4643 16.1548 16.5 16.3977C15.3104 16.6973 13.8894 17.3461 12.79 17.9055C12.4832 18.0616 12.1582 18.1742 11.8252 18.2444V2.26585C12.1778 2.18339 12.5204 2.05318 12.8408 1.8762C13.7884 1.35272 14.9518 0.77966 15.9502 0.494366C17.1017 0.165421 18.6485 0.0424792 19.8896 0.00120146ZM19.5 10.2922C19.3894 9.87046 18.9419 9.61362 18.5 9.71898L14.0996 10.7688C13.6578 10.8743 13.3897 11.3021 13.5 11.7239C13.6106 12.1456 14.0581 12.4025 14.5 12.2971L18.9004 11.2463C19.342 11.1407 19.6102 10.7139 19.5 10.2922ZM19.5 6.09202C19.3894 5.67028 18.9419 5.41346 18.5 5.51878L14.0996 6.56858C13.6578 6.67412 13.3897 7.10185 13.5 7.52366C13.6105 7.94558 14.058 8.20235 14.5 8.0969L18.9004 7.0471C19.3422 6.94149 19.6104 6.5138 19.5 6.09202Z"
        fill="currentColor"
      />
      <rect
        width="6.16522"
        height="1.59241"
        rx="0.796204"
        transform="matrix(-0.971526 -0.236931 -0.245264 0.969456 8.58274 6.76514)"
        fill="white"
      />
      <rect
        width="6.19655"
        height="1.57462"
        rx="0.78731"
        transform="matrix(-0.971526 -0.236931 -0.245264 0.969456 8.60618 10.9873)"
        fill="white"
      />
      <rect
        width="6.16522"
        height="1.59241"
        rx="0.796204"
        transform="matrix(0.971526 -0.236931 0.245264 0.969456 13.303 6.76514)"
        fill="white"
      />
      <rect
        width="6.19655"
        height="1.57462"
        rx="0.78731"
        transform="matrix(0.971526 -0.236931 0.245264 0.969456 13.2749 10.9873)"
        fill="white"
      />
    </svg>
  );
}

export function BookmarksIcon(props: IconProps) {
  return (
    <svg
      width={15}
      height={16}
      viewBox="0 0 15 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 7.27802V11.2727C15 13.75 15 14.9886 14.3882 15.5298C14.0965 15.788 13.7282 15.9501 13.3359 15.9932C12.5133 16.0836 11.5527 15.2679 9.63153 13.6367C8.78232 12.9156 8.35771 12.5551 7.86644 12.4601C7.62452 12.4133 7.37548 12.4133 7.13356 12.4601C6.64229 12.5551 6.21768 12.9156 5.36847 13.6367C3.44728 15.2679 2.48668 16.0836 1.6641 15.9932C1.27179 15.9501 0.903512 15.788 0.611755 15.5298C0 14.9886 0 13.75 0 11.2727V7.27801C0 3.84713 0 2.13168 1.09835 1.06584C2.1967 0 3.96447 0 7.5 0C11.0355 0 12.8033 0 13.9016 1.06584C15 2.13168 15 3.84713 15 7.27802ZM4.375 3.2C4.375 2.86863 4.65482 2.6 5 2.6H10C10.3452 2.6 10.625 2.86863 10.625 3.2C10.625 3.53137 10.3452 3.8 10 3.8H5C4.65482 3.8 4.375 3.53137 4.375 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DraftsIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.47631 2.64281C2.5 3.61913 2.5 5.19047 2.5 8.33317V11.6665C2.5 14.8092 2.5 16.3805 3.47631 17.3569C4.45262 18.3332 6.02397 18.3332 9.16667 18.3332H10.8333C13.976 18.3332 15.5474 18.3332 16.5237 17.3569C17.5 16.3805 17.5 14.8092 17.5 11.6665V8.33317C17.5 5.19047 17.5 3.61913 16.5237 2.64281C15.5474 1.6665 13.976 1.6665 10.8333 1.6665H9.16667C6.02397 1.6665 4.45262 1.6665 3.47631 2.64281ZM6.04167 6.6665C6.04167 6.32133 6.32149 6.0415 6.66667 6.0415H13.3333C13.6785 6.0415 13.9583 6.32133 13.9583 6.6665C13.9583 7.01168 13.6785 7.2915 13.3333 7.2915H6.66667C6.32149 7.2915 6.04167 7.01168 6.04167 6.6665ZM6.04167 9.99984C6.04167 9.65466 6.32149 9.37484 6.66667 9.37484H13.3333C13.6785 9.37484 13.9583 9.65466 13.9583 9.99984C13.9583 10.345 13.6785 10.6248 13.3333 10.6248H6.66667C6.32149 10.6248 6.04167 10.345 6.04167 9.99984ZM6.66667 12.7082C6.32149 12.7082 6.04167 12.988 6.04167 13.3332C6.04167 13.6783 6.32149 13.9582 6.66667 13.9582H10.8333C11.1785 13.9582 11.4583 13.6783 11.4583 13.3332C11.4583 12.988 11.1785 12.7082 10.8333 12.7082H6.66667Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg
      width={38}
      height={38}
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M13.2237 32.0494C14.5554 33.7423 16.6475 34.8332 19 34.8332C21.3526 34.8332 23.4446 33.7423 24.7763 32.0494C20.9419 32.569 17.0582 32.569 13.2237 32.0494Z"
        fill="currentColor"
      />
      <path
        d="M29.6861 14.2498V15.3647C29.6861 16.7026 30.068 18.0105 30.7835 19.1237L32.5369 21.8517C34.1385 24.3434 32.9158 27.7302 30.1303 28.5181C22.8432 30.5794 15.1568 30.5794 7.86974 28.5181C5.08416 27.7302 3.86147 24.3434 5.46307 21.8517L7.21651 19.1237C7.93205 18.0105 8.31388 16.7026 8.31388 15.3647V14.2498C8.31388 8.12868 13.0982 3.1665 19 3.1665C24.9018 3.1665 29.6861 8.12868 29.6861 14.2498Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function BookmarkIcon({
  filled,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={18}
      height={23}
      viewBox="0 0 18 23"
      fill={filled ? "currentColor" : "none"}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M14.3921 21.4149L9.93378 18.1577C9.36329 17.7477 8.64489 17.7477 8.05327 18.1577L3.595 21.4149C2.41176 22.2805 0.869324 21.2783 0.869324 19.6155V2.96472C0.869324 1.80304 1.67224 0.869141 2.64418 0.869141H15.3217C16.3148 0.869141 17.0966 1.80304 17.0966 2.96472V19.6155C17.0966 21.2555 15.5753 22.2577 14.3709 21.4149H14.3921Z"
        stroke="currentColor"
        strokeWidth="1.73864"
        strokeMiterlimit="10"
      />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M21.6004 18.1623L23.5899 12.1938C25.3279 6.97973 26.1969 4.37271 24.8208 2.99656C23.4446 1.6204 20.8376 2.48941 15.6236 4.22742L9.65501 6.21694C5.44677 7.61968 3.34266 8.32105 2.74473 9.34957C2.17591 10.328 2.17591 11.5364 2.74473 12.5149C3.34266 13.5434 5.44677 14.2448 9.655 15.6475C10.3307 15.8727 10.6686 15.9854 10.9509 16.1744C11.2246 16.3576 11.4597 16.5927 11.6429 16.8664C11.832 17.1488 11.9446 17.4866 12.1698 18.1623C13.5726 22.3705 14.2739 24.4747 15.3024 25.0726C16.2809 25.6414 17.4893 25.6414 18.4677 25.0726C19.4963 24.4747 20.1976 22.3705 21.6004 18.1623Z"
        stroke="currentColor"
        strokeWidth="1.73864"
      />
      <path
        d="M18.7907 10.2553C19.132 9.91772 19.1351 9.36731 18.7975 9.02594C18.4599 8.68458 17.9095 8.68152 17.5681 9.01913L18.1794 9.63723L18.7907 10.2553ZM11.7477 15.998L12.359 16.6161L18.7907 10.2553L18.1794 9.63723L17.5681 9.01913L11.1364 15.3799L11.7477 15.998Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="8.00001" cy="4.00016" r="2.66667" fill="currentColor" />
      <path
        d="M13.3333 11.6665C13.3333 13.3234 13.3333 14.6665 7.99999 14.6665C2.66666 14.6665 2.66666 13.3234 2.66666 11.6665C2.66666 10.0096 5.05447 8.6665 7.99999 8.6665C10.9455 8.6665 13.3333 10.0096 13.3333 11.6665Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CirclesIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="8" r="4.5" />
      <circle cx="7.5" cy="15" r="4.5" />
      <circle cx="16.5" cy="15" r="4.5" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
      <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6L15.5 17.5l2.6-.9L19 14z" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function HeartIcon({
  filled,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0014 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function VideoPlayIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function CakeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M20 21v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8" />
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <path d="M2 21h20" />
      <path d="M7 8v3" />
      <path d="M12 8v3" />
      <path d="M17 8v3" />
      <path d="M7 4h.01" />
      <path d="M12 4h.01" />
      <path d="M17 4h.01" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function MoreHorizontalIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function MusicNoteIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function MicrophoneIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9.22729 10.545C9.22729 6.90495 12.1781 3.9541 15.8182 3.9541C19.4583 3.9541 22.4091 6.90495 22.4091 10.545V14.4996C22.4091 18.1396 19.4583 21.0905 15.8182 21.0905C12.1781 21.0905 9.22729 18.1396 9.22729 14.4996V10.545Z"
        stroke="currentColor"
        strokeWidth="1.97727"
      />
      <path
        d="M17.1364 10.5459L22.4091 10.5459"
        stroke="currentColor"
        strokeWidth="1.97727"
        strokeLinecap="round"
      />
      <path
        d="M17.1364 14.5L22.4091 14.5"
        stroke="currentColor"
        strokeWidth="1.97727"
        strokeLinecap="round"
      />
      <path
        d="M26.3636 13.1816V14.4998C26.3636 20.3239 21.6423 25.0453 15.8182 25.0453C9.99407 25.0453 5.27271 20.3239 5.27271 14.4998V13.1816"
        stroke="currentColor"
        strokeWidth="1.97727"
        strokeLinecap="round"
      />
      <path
        d="M15.8182 25.0459V29.0004"
        stroke="currentColor"
        strokeWidth="1.97727"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VideoCameraAddIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M25.5 14.2503L26.4875 13.7565C29.4064 12.2971 30.8658 11.5674 31.9329 12.2269C33 12.8864 33 14.5181 33 17.7814V18.2191C33 21.4825 33 23.1142 31.9329 23.7737C30.8658 24.4332 29.4064 23.7035 26.4875 22.2441L25.5 21.7503V14.2503Z"
        stroke="currentColor"
        strokeWidth="1.99998"
      />
      <path
        d="M3 17.25C3 12.3188 3 9.85317 4.36194 8.19364C4.61126 7.88984 4.88984 7.61126 5.19364 7.36194C6.85317 6 9.31878 6 14.25 6C19.1812 6 21.6468 6 23.3064 7.36194C23.6102 7.61126 23.8887 7.88984 24.1381 8.19364C25.5 9.85317 25.5 12.3188 25.5 17.25V18.75C25.5 23.6812 25.5 26.1468 24.1381 27.8064C23.8887 28.1102 23.6102 28.3887 23.3064 28.6381C21.6468 30 19.1812 30 14.25 30C9.31878 30 6.85317 30 5.19364 28.6381C4.88984 28.3887 4.61126 28.1102 4.36194 27.8064C3 26.1468 3 23.6812 3 18.75V17.25Z"
        stroke="currentColor"
        strokeWidth="1.99998"
      />
      <path
        d="M10.9773 23.1963L10.9773 12.8037L19.9773 18L10.9773 23.1963Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function GalleryIcon(props: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2.63708 15.8176C2.63708 9.60359 2.63708 6.49661 4.56752 4.56617C6.49795 2.63574 9.60493 2.63574 15.8189 2.63574C22.0329 2.63574 25.1399 2.63574 27.0703 4.56617C29.0007 6.49661 29.0007 9.60359 29.0007 15.8176C29.0007 22.0315 29.0007 25.1385 27.0703 27.0689C25.1399 28.9994 22.0329 28.9994 15.8189 28.9994C9.60493 28.9994 6.49795 28.9994 4.56752 27.0689C2.63708 25.1385 2.63708 22.0315 2.63708 15.8176Z"
        stroke="currentColor"
        strokeWidth="1.97727"
      />
      <circle
        cx="21.0917"
        cy="10.5455"
        r="2.63636"
        stroke="currentColor"
        strokeWidth="1.97727"
      />
      <path
        d="M2.63708 16.4775L4.94599 14.4572C6.14721 13.4061 7.95763 13.4664 9.08627 14.595L14.7409 20.2497C15.6468 21.1556 17.0728 21.2791 18.121 20.5425L18.5141 20.2662C20.0224 19.2062 22.063 19.329 23.4333 20.5623L27.6825 24.3865"
        stroke="currentColor"
        strokeWidth="1.97727"
        strokeLinecap="round"
      />
    </svg>
  );
}
