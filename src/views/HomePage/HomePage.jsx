import NavBar from "./components/NavBar";
import HeroSection from "./components/HeroSection";
import StoriesSection from "./components/StoriesSection";
import HowItWorks from "./components/HowItWorks";
import AboutSection from "./components/AboutSection";
import FaqSection from "./components/FaqSection";
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
      <FaqSection />
      <CtaBanner />
      <HomeFooter />
    </div>
  );
};

export default HomePage;
