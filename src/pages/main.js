import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainStyles from "./main.module.css";
import LandingIntroduction from "../components/Landing/LandingIntroduction/landingIntroduction";
import LandingDiscovery from "../components/Landing/LandingIcons/landingDiscovery";
import LandingIntegration from "../components/Landing/LandingIcons/landingIntegrations";
import LandingStandards from "../components/Landing/LandingIcons/landingStandards";
import LandingSecurity from "../components/Landing/LandingIcons/landingSecurity";
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

function Main() {
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Single handler to control indicator
  useEffect(() => {
    const update = () => {
      const docEl = document.documentElement;
      const maxScroll = Math.max(0, docEl.scrollHeight - window.innerHeight);
      const y = window.scrollY || docEl.scrollTop || 0;
      const EPS = 2;
      setShowScrollIndicator(y < maxScroll - EPS);
    };

    // run once and then attach listeners
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const handleScrollClick = () => {
    const docEl = document.documentElement;
    const maxScroll = Math.max(0, docEl.scrollHeight - window.innerHeight);
    const y = window.scrollY || docEl.scrollTop || 0;

    // step one viewport, but never beyond bottom
    const next = Math.min(y + window.innerHeight, maxScroll);
    window.scrollTo({ top: next, behavior: "smooth" });
  };

  return (
    <div className={MainStyles.pageContainer}>
      <LandingIntroduction />
      <div className={MainStyles.mainContainer}>
        <section className={MainStyles.featuresSection}>
          <div className={MainStyles.featureGrid}>
            <article className={MainStyles.featureCard}>
              <div className={MainStyles.featureIconWrap}>
                <LandingDiscovery size={150} />
              </div>
              <h3 className={MainStyles.featureTitle}>Discovery and profiling</h3>
              <p className={MainStyles.featureText}>
                Scan and search across local clinical files, tables, and documents.
                Profile variables, spot gaps, and preview data quality without moving data off-site.
              </p>
            </article>

            <article className={MainStyles.featureCard}>
              <div className={MainStyles.featureIconWrap}>
                <LandingIntegration size={150} />
              </div>
              <h3 className={MainStyles.featureTitle}>Integration made easy</h3>
              <p className={MainStyles.featureText}>
                Bring in heterogeneous spreadsheets and CSV exports, then
                combine, clean and transform them with a lightweight, iterative workflow.
              </p>
            </article>

            <article className={MainStyles.featureCard}>
              <div className={MainStyles.featureIconWrap}>
                <LandingStandards size={150} />
              </div>
              <h3 className={MainStyles.featureTitle}>Health standards ready</h3>
              <p className={MainStyles.featureText}>
                Map local fields to common healthcare terminologies and models so datasets from
                different hospitals speak the same language.
              </p>
            </article>
          </div>
        </section>
        <div className={MainStyles.contentContainer}>
          <div className={MainStyles.textImageContainer}>
            <div className={MainStyles.textContainer}>
              <p className={MainStyles.introText}>
                The MEDIATA platform aims to provide a unified and browser-accessible interface for the secure exploration,
                cleaning, harmonization and semantic annotation of distributed clinical datasets.

                It is designed to support research projects in the clinical field with multiple participants,
                where sensitive data requires careful harmonization across sites.
                Users can connect to individual nodes or operate across several simultaneously,
                enabling collaborative workflows while keeping all raw patient data securely on local servers.
                With instant profiling, clear visual summaries, and support for mapping to healthcare standards,
                MEDIATA ensures that datasets from different hospitals or research centers can
                speak the same language without moving the data off-site.
              </p>
              <span className={MainStyles.lesserText}>
                The design of MEDIATA platform is grounded in the real-world practical requirements,
                identified within harmonization use-cases.
              </span>
            </div>
          </div>
        </div>
        <div className={MainStyles.highlightSection}>
          <div className={MainStyles.contentContainer}>
            <div className={MainStyles.textImageContainer}>
              <div className={MainStyles.featureIconWrap}>
                <LandingSecurity size={150} />
              </div>
              <div className={MainStyles.textContainer}>
                <h2 className={MainStyles.leftHeading}>Access your data securely</h2>
                <span className={MainStyles.introText}>
                  MEDIATA is built with security and privacy at its core. Sensitive patient data never leaves
                  the hospital servers; instead, all sensitive processing happens locally at each participating node,
                  and only aggregated or anonymized results are shared. The platform uses a federated
                  architecture with Kerberos-based single sign-on and end-to-end TLS encryption, ensuring
                  that users authenticate once and can securely interact with multiple sites without exposing
                  credentials or raw datasets. This approach guarantees compliance with strict regulations
                  such as GDPR and HIPAA.
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className={MainStyles.contentContainer}>
          <div className={MainStyles.textImageContainer}>
            <div className={MainStyles.textContainer}>
              <h2 className={MainStyles.centeredHeading}>User accessible</h2>
              <span className={MainStyles.introText}>
                The MEDIATA platform is designed to be accessible directly from your browser,
                without requiring complex setup or setting up individual server access.
                To learn how it works, you can check the tutorial for
                a step-by-step walkthrough.
              </span>
            </div>
            <div className={MainStyles.buttonContainerRight}>
              <Link to={"/tutorial"}>
                <button className={MainStyles.big_button}>Check the tutorial <ChevronRightIcon /></button>
              </Link>
            </div>
          </div>
        </div>
        <div className={MainStyles.finalSection}>
          <div className={MainStyles.contentContainer}>
              <Link to={"/discovery"}>
                <button className={MainStyles.big_button}>Explore your datasets</button>
              </Link>
          </div>
        </div>
        {showScrollIndicator && (
          <div className={MainStyles.scrollIndicator} onClick={handleScrollClick}>
            <div className={MainStyles.arrow} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Main;
