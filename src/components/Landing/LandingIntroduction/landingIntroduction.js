import React from "react";
import LandingIntroStyles from "./landingIntroduction.module.css";
import LandingBackground from "../LandingBackground/landingBackground";

const IntroductionSection = () => {
  return (
    <section className={LandingIntroStyles.introSection} aria-label="Introduction Section">
      <div className={LandingIntroStyles.titleContainer}>
        <img
          className={LandingIntroStyles.logo}
          src={`${process.env.PUBLIC_URL}/mediata_logo.png?v=1.0.1`}
          alt="MEDIATA logo"
          loading="eager"
          fetchpriority="high"
        />
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
