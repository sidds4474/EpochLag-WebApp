import NavBar from "./components/NavBar";
import HeroSection from "./components/HeroSection";
import StoriesSection from "./components/StoriesSection";
import HowItWorks from "./components/HowItWorks";
import AboutSection from "./components/AboutSection";
import TestimonialsSection from "./components/TestimonialsSection";
import FaqSection from "./components/FaqSection";
import NewsletterSection from "./components/NewsletterSection";
import CtaBanner from "./components/CtaBanner";
import HomeFooter from "./components/HomeFooter";

const HomePage = () => {
  return (
    <div className="w-full h-full">
      <NavBar />
      <HeroSection />
      <StoriesSection />
      <HowItWorks />
      <AboutSection />
      <TestimonialsSection />
      <FaqSection />
      <NewsletterSection />
      <CtaBanner />
      <HomeFooter />
    </div>
  );
};

export default HomePage;
