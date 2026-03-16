import React from "react";
import LandingIntroStyles from "./landingIntroduction.module.css";
import LandingBackground from "../LandingBackground/landingBackground";

// Main logo and intro paragraph for the landing page
const IntroductionSection = () => {
  return (
    <section className={LandingIntroStyles.introSection} aria-label="Introduction Section">
      <div className={LandingIntroStyles.titleContainer}>
        <span className={LandingIntroStyles.logoWrap}>
          <img
            className={LandingIntroStyles.logo}
            src={`${import.meta.env.BASE_URL}mediata_logo.png?v=1.0.1`}
            alt="MEDIATA logo"
            loading="eager"
            fetchpriority="high"
          />
        </span>
      </div>

      <LandingBackground />
      <div className={LandingIntroStyles.paragraphContainer}>
        <p>
          MEDIATA is your comprehensive solution for managing clinical patient
          data. Experience the power of an iterative, streamlined all-in-one data pipeline
          that guarantees security and is designed for healthcare professionals.
        </p>
      </div>
    </section>
  );
}

export default IntroductionSection;
