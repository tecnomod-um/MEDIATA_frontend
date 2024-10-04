import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainStyles from "./main.module.css";
import LandingIntroduction from "../components/LandingIntroduction/landingIntroduction";

// Landing page for the app
function Main() {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollOffset(window.scrollY);

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleScrollIndicator = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );

      setShowScrollIndicator(scrollOffset + windowHeight < documentHeight - 1);
    };

    window.addEventListener("scroll", handleScrollIndicator);
    handleScrollIndicator();
    return () => {
      window.removeEventListener("scroll", handleScrollIndicator);
    };
  }, [scrollOffset]);

  const handleScrollClick = () => {
    const viewportHeight = window.innerHeight;

    if (scrollOffset < viewportHeight)
      window.scrollTo({
        top: viewportHeight,
        behavior: "smooth",
      });
    else
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
  };

  return (
    <div className={MainStyles.pageContainer}>
      <LandingIntroduction />
      <div className={MainStyles.mainContainer}>
        <h1 className={MainStyles.mainHeader}> </h1>
        {/* Introduction Section */}
        <div className={MainStyles.contentContainer}>
          <div className={MainStyles.textImageContainer}>
            <div className={MainStyles.textContainer}>
              <h2 className={MainStyles.centeredHeading}>Introduction</h2>
              <p className={MainStyles.introText}>
                TANIWHA is an innovative web tool suite designed to streamline
                the management of clinical patient data. With a focus on
                efficiency and ease of use, TANIWHA offers a data viewing
                utility that ingests CSV files, presenting a comprehensive
                overview through relevant statistics and visual graphs. This
                tool not only allows for a detailed analysis of patient data but
                also facilitates the exportation of these insights.
                Complementing this, TANIWHA's parsing tool adeptly transforms
                diverse clinical patient CSV formats into a standardized
                ontology model, ensuring seamless data integration and
                accessibility.
              </p>
              <span className={MainStyles.lesserText}>
                Our suite is tailored for healthcare professionals seeking to
                optimize patient data management through technological
                innovation. Whether you're looking to analyze data trends,
                streamline data formatting, or simply enhance your data's
                accessibility, TANIWHA provides the tools necessary to transform
                your data into actionable insights.
              </span>
            </div>
          </div>
        </div>
        {/* Design Section */}
        <div className={MainStyles.contentContainer}>
          <div className={MainStyles.textImageContainer}>
            <div className={MainStyles.textContainer}>
              <h2 className={MainStyles.centeredHeading}>Design</h2>
              <span className={MainStyles.introText}>
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                in reprehenderit in voluptate velit esse cillum dolore eu fugiat
                nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                sunt in culpa qui officia deserunt mollit anim id est laborum."
              </span>
            </div>
          </div>
        </div>
        {/* Get Started Button */}
        <div className={MainStyles.buttonContainer}>
          <Link to={"/csvchecker"}>
            <button className={MainStyles.big_button}>Get Started</button>
          </Link>
        </div>
        {/* Scroll Indicator */}
        {showScrollIndicator && (
          <div
            className={MainStyles.scrollIndicator}
            onClick={handleScrollClick}
          >
            <div className={MainStyles.arrow} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Main;
