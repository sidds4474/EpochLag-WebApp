"use client";

import { useState, useId } from "react";
import toast from "react-hot-toast";

const NotifyInput = () => {
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleNotify = async () => {
    if (!email) {
      setError("Please enter an email address");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://backend.epochlag.com/api/waitlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success(data.message || "You've been added to the waitlist!");
        setEmail("");
      } else {
        toast.error(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="pl-[16px] py-[16px] w-full h-[50px] bg-primary-white flex items-center rounded-[30px]">
        <input
          type="email"
          placeholder="Email"
          id={`email-${id}`}
          name={`email-${id}`}
          autoComplete="off"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          disabled={isLoading}
          className="focus:outline-none bg-transparent w-full text-[12px] md:text-[14px] font-medium font-montserrat text-primary-black placeholder:text-primary-black/30 placeholder:text-[12px] md:placeholder:text-[14px] placeholder:font-medium placeholder:font-montserrat disabled:opacity-50"
        />
        <button
          onClick={handleNotify}
          disabled={isLoading}
          className="cursor-pointer bg-primary-orange rounded-[30px] shrink-0 w-[135px] h-[50px] text-[14px] md:text-[16px] font-medium font-montserrat text-primary-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Loading..." : "Notify Me"}
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-[10px] md:text-[12px] font-montserrat mt-1 ml-4">
          {error}
        </p>
      )}
    </div>
  );
};

export default NotifyInput;
