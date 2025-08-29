import React from "react";
import Hero from "./hero";
import { Section } from "./section";
import Footer from "./footer";

const PageContent = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow">
        <Section className="flex flex-col gap-y-24">
          <Hero />
        </Section>
      </div>
      <Footer />
    </div>
  );
};

export default PageContent;