import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useMatch } from "react-router-dom";
import NavbarStyles from "./navbar.module.css";
import { useAuth } from "../../../context/authContext";
import { useNode } from "../../../context/nodeContext";
import CustomLink from "./customLink";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { FaFileAlt, FaSearch, FaSitemap, FaCodeBranch } from "react-icons/fa";
import { ReactComponent as FhirIcon } from "../../../resources/images/fhir.svg";

function FileSearchIcon() {
  return (
    <div
    aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-block",
        width: "1.2em",
        height: "1.2em"
      }}
    >
      <FaFileAlt
        style={{
          fontSize: "1.2em",
          color: "#fff",
          position: "absolute",
          top: 0,
          left: 0
        }}
      />
      <FaSearch
        style={{
          fontSize: "0.75em",
          color: "#08242c",
          position: "absolute",
          top: "28%",
          left: "22%"
        }}
      />
    </div>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { selectedNodes } = useNode();
  const navigate = useNavigate();

  const discoveryMatch = useMatch({ path: "/discovery", end: true });
  const integrationMatch = useMatch({ path: "/integration", end: true });
  const semanticAlignmentMatch = useMatch({ path: "/semanticalignment", end: true });
  const fhirMatch = useMatch({ path: "/hl7fhir", end: true })
  const extraOptionsRef = useRef(null);

  const toggleMenu = () => {
    if (!menuOpen) setAnimate(true);
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setAnimate(false);
      setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className={NavbarStyles.navbar} aria-label="Main navigation">
      <Link to="/" className={`${NavbarStyles.logo} ${NavbarStyles.link}`}>
        <img
          className={NavbarStyles.logo}
          src={`${process.env.PUBLIC_URL}/umu_coat.svg`}
          width={40}
          height={40}
          alt="University of Murcia logo"
          loading="eager"
          fetchpriority="high"
        />
      </Link>
      <ul className={NavbarStyles.navlinks}>
        <TransitionGroup component={null}>
          {isAuthenticated && selectedNodes && (
            <CSSTransition
              key="extra-options"
              nodeRef={extraOptionsRef}
              timeout={300}
              classNames={{
                enter: NavbarStyles.fadeEnter,
                enterActive: NavbarStyles.fadeEnterActive,
                exit: NavbarStyles.fadeExit,
                exitActive: NavbarStyles.fadeExitActive
              }}
            >
              <div ref={extraOptionsRef} className={NavbarStyles.darkerContainer}>
                <li className={`${NavbarStyles.listItem} ${NavbarStyles.darkerItem} ${discoveryMatch ? NavbarStyles.activeDarker : ""}`} >
                  <CustomLink to="/discovery" reloadOnActive>
                    <span className={NavbarStyles.desktopLabel} title="Dataset analysis and exploration">
                      Discovery
                    </span>
                    <span className={NavbarStyles.mobileIcon}>
                      <FileSearchIcon />
                    </span>
                  </CustomLink>
                </li>
                <li className={`${NavbarStyles.listItem} ${NavbarStyles.darkerItem} ${integrationMatch ? NavbarStyles.activeDarker : ""}`}   >
                  <CustomLink to="/integration" reloadOnActive>
                    <span
                      className={NavbarStyles.desktopLabel}
                      title="Harmonization and standardizing from different sources"
                    >
                      Integration
                    </span>
                    <span className={NavbarStyles.mobileIcon}>
                      <FaCodeBranch aria-hidden="true" style={{ fontSize: "1.2em" }} />
                    </span>
                  </CustomLink>
                </li>
                <li className={`${NavbarStyles.listItem} ${NavbarStyles.darkerItem} ${semanticAlignmentMatch ? NavbarStyles.activeDarker : ""}`}   >
                  <CustomLink to="/semanticalignment" reloadOnActive>
                    <span className={NavbarStyles.desktopLabel} title="Map and align the data to an ontology">
                      Semantic-Alignment
                    </span>
                    <span className={NavbarStyles.mobileIcon}>
                      <FaSitemap aria-hidden="true" style={{ fontSize: "1.2em" }} />
                    </span>
                  </CustomLink>
                </li>
                <li className={`${NavbarStyles.listItem} ${NavbarStyles.darkerItem} ${fhirMatch ? NavbarStyles.activeDarker : ""}`} >
                  <CustomLink to="/hl7fhir" reloadOnActive>
                    <span className={NavbarStyles.desktopLabel} title="Create HL7 FHIR mappings">
                      HL7 FHIR
                    </span>
                    <span className={NavbarStyles.mobileIcon}>
                      <FhirIcon aria-hidden="true" style={{ width: "1.2em", height: "1.2em" }} />
                    </span>
                  </CustomLink>
                </li>
              </div>
            </CSSTransition>
          )}
        </TransitionGroup>
        <input
          type="checkbox"
          id="menuToggle"
          className={NavbarStyles.checkboxToggle}
          checked={menuOpen}
          onChange={toggleMenu}
          aria-label="Toggle menu"
          aria-controls="main-menu"
          aria-expanded={menuOpen}
        />
        <label htmlFor="menuToggle" className={NavbarStyles.hamburger}>
          &#9776;
        </label>
        <div 
          id="main-menu"
          className={`${NavbarStyles.menu} ${menuOpen && animate ? NavbarStyles.animate : ""}`}
          role="menu"
          aria-labelledby="menuToggle"
        >
          <li className={NavbarStyles.listItem} role="none">
            <CustomLink to="/" onClick={toggleMenu} role="menuitem">
              Home
            </CustomLink>
          </li>
          {isAuthenticated && (
            <li className={NavbarStyles.listItem} role="none">
              <CustomLink to="/nodes" onClick={toggleMenu} role="menuitem">
                Nodes
              </CustomLink>
            </li>
          )}
          {!isAuthenticated ? (
            <li className={NavbarStyles.listItem} role="none">
              <CustomLink to="/login" onClick={toggleMenu} role="menuitem">
                Login
              </CustomLink>
            </li>
          ) : (
            <li className={NavbarStyles.listItem} role="none">
              <CustomLink to="/login" onClick={handleLogout} role="menuitem">
                Logout
              </CustomLink>
            </li>
          )}
          <li className={NavbarStyles.listItem} role="none">
            <CustomLink to="/tutorial" onClick={toggleMenu} role="menuitem">
              Tutorial
            </CustomLink>
          </li>
          <li className={NavbarStyles.listItem} role="none">
            <CustomLink to="/about" onClick={toggleMenu} role="menuitem">
              About
            </CustomLink>
          </li>
        </div>
      </ul>
    </nav>
  );
}