import React from "react";
import LandingIntroductionStyles from "./landingIntroduction.module.css";
import LandingBackground from "../LandingBackground/landingBackground";

const IntroductionSection = () => {
  return (
    <>
      <LandingBackground />
      <div className={LandingIntroductionStyles.introSection}>
        <h1 className={LandingIntroductionStyles.fadeIn}>
          TANIWHA - Clinical Data Management
        </h1>
        <p className={LandingIntroductionStyles.fadeIn}>
          TANIWHA is your comprehensive solution for managing clinical patient
          data with precision. Experience the power of streamlined data viewing
          and parsing tools designed for healthcare professionals.
        </p>
      </div>
    </>
  );
};

export default IntroductionSection;
