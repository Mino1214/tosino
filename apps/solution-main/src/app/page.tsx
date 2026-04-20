import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Services } from "@/components/landing/Services";
import { WhyUs } from "@/components/landing/WhyUs";
import { PlatformMockup } from "@/components/landing/PlatformMockup";
import { Industries } from "@/components/landing/Industries";
import { Process } from "@/components/landing/Process";
import { Testimonials } from "@/components/landing/Testimonials";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <Services />
        <WhyUs />
        <PlatformMockup />
        <Industries />
        <Process />
        <Testimonials />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
