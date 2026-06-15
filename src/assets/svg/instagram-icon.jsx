import React from "react";

const InstagramIcon = ({ className, ...rest }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={className ? className : "w-6 h-6"}
      {...rest}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16 3.243H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5v-8a5 5 0 0 0-5-5m3.25 13a3.26 3.26 0 0 1-3.25 3.25H8a3.26 3.26 0 0 1-3.25-3.25v-8A3.26 3.26 0 0 1 8 4.993h8a3.26 3.26 0 0 1 3.25 3.25zm-2.5-7.75a1 1 0 1 0 0-2 1 1 0 0 0 0 2M12 7.743a4.5 4.5 0 1 0 4.5 4.5 4.49 4.49 0 0 0-4.5-4.5m-2.75 4.5a2.75 2.75 0 1 0 5.5 0 2.75 2.75 0 0 0-5.5 0"
        clipRule="evenodd"
      ></path>
    </svg>
  );
};

export default InstagramIcon;
