"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import ContactImage from "../../../assets/images/contact-image.jpg";

const ContactModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("https://api.epochlag.com/api/contact-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.name,
          lastName: "",
          message: formData.message,
          isAppUser: false,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success(data.message || "Message sent successfully!");
        setFormData({ name: "", email: "", message: "" });
        onClose();
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-[16px] md:px-[24px]"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[900px] bg-[#FFFFFF] rounded-[20px] md:rounded-[24px] overflow-hidden flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left - Image */}
            <div className="hidden md:block md:w-[40%] lg:w-[45%] p-[16px]">
              <img
                src={ContactImage.src}
                alt="Two kids smiling"
                className="w-full h-full object-cover rounded-[12px] md:rounded-[16px]"
              />
            </div>

            {/* Right - Form */}
            <div className="flex-1 p-[24px] md:p-[32px] lg:p-[40px] flex flex-col justify-center">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-[16px] right-[16px] w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-blue">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>

              <h2 className="font-ivy text-primary-blue text-[24px] md:text-[32px] lg:text-[36px] font-bold leading-[110%]">
                Contact Us
              </h2>
              <p className="mt-[12px] md:mt-[16px] font-montserrat text-primary-blue text-[14px] md:text-[15px] font-normal leading-[160%]">
                Have a question or need help? Contact us anytime, we&apos;re here for you.
              </p>

              <form onSubmit={handleSubmit} className="mt-[24px] md:mt-[32px] flex flex-col gap-[16px]">
                <input
                  type="text"
                  name="name"
                  placeholder="Name*"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-[20px] py-[14px] md:py-[16px] rounded-full bg-[#F1F1F1] border-none outline-none font-montserrat text-primary-blue text-[14px] md:text-[15px] placeholder:text-primary-blue/40"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email*"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-[20px] py-[14px] md:py-[16px] rounded-full bg-[#F1F1F1] border-none outline-none font-montserrat text-primary-blue text-[14px] md:text-[15px] placeholder:text-primary-blue/40"
                />
                <textarea
                  name="message"
                  placeholder="Message*"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-[20px] py-[14px] md:py-[16px] rounded-[16px] bg-[#F1F1F1] border-none outline-none font-montserrat text-primary-blue text-[14px] md:text-[15px] placeholder:text-primary-blue/40 resize-none"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-[14px] md:py-[16px] rounded-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] md:text-[16px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContactModal;
