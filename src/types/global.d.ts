declare module "*.css";

type GoogleIdInitializeOptions = {
  client_id: string;
  callback: (response: { credential: string; select_by?: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
};

type GoogleIdButtonOptions = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "small" | "medium" | "large";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
};

type GoogleAccountsId = {
  initialize: (options: GoogleIdInitializeOptions) => void;
  renderButton: (parent: HTMLElement, options: GoogleIdButtonOptions) => void;
  prompt: () => void;
  cancel: () => void;
  disableAutoSelect: () => void;
};

interface Window {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  google?: {
    accounts: {
      id: GoogleAccountsId;
    };
  };
}
