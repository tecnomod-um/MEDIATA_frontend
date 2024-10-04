import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarStyles from "./navbar.module.css";
import logo from "../../resources/images/umu_coat.png";
import { useAuth } from "../../context/authContext";
import { useNode } from "../../context/nodeContext";
import CustomLink from "./customLink";
import { CSSTransition, TransitionGroup } from "react-transition-group";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { selectedNode } = useNode();
  const navigate = useNavigate();

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
    <nav className={NavbarStyles.navbar}>
      <Link to="/" className={`${NavbarStyles.logo} ${NavbarStyles.link}`}>
        <img
          src={logo}
          width={40}
          height={40}
          alt="University of Murcia logo"
        />
      </Link>
      <ul className={NavbarStyles.navlinks}>
        <TransitionGroup component={null}>
          {isAuthenticated && selectedNode && (
            <CSSTransition
              key="extra-options"
              timeout={300}
              classNames={{
                enter: NavbarStyles.fadeEnter,
                enterActive: NavbarStyles.fadeEnterActive,
                exit: NavbarStyles.fadeExit,
                exitActive: NavbarStyles.fadeExitActive,
              }}
            >
              <div className={NavbarStyles.darkerContainer}>
                <li
                  className={`${NavbarStyles.listItem} ${NavbarStyles.darkerItem}`}
                >
                  <CustomLink to="/csvchecker" onClick={toggleMenu} noToggle>
                    CSV Checker
                  </CustomLink>
                </li>
                <li
                  className={`${NavbarStyles.listItem} ${NavbarStyles.darkerItem}`}
                >
                  <CustomLink to="/rdfparser" onClick={toggleMenu} noToggle>
                    RDF Parser
                  </CustomLink>
                </li>
                <li
                  className={`${NavbarStyles.listItem} ${NavbarStyles.darkerItem}`}
                >
                  <CustomLink to="/rdfbuilder" onClick={toggleMenu} noToggle>
                    RDF Builder
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
        />
        <label htmlFor="menuToggle" className={NavbarStyles.hamburger}>
          &#9776;
        </label>
        <div
          className={`${NavbarStyles.menu} ${
            menuOpen && animate ? NavbarStyles.animate : ""
          }`}
        >
          <li className={NavbarStyles.listItem}>
            <CustomLink to="/" onClick={toggleMenu}>
              Home
            </CustomLink>
          </li>
          {isAuthenticated && (
            <li className={NavbarStyles.listItem}>
              <CustomLink to="/nodes" onClick={toggleMenu}>
                Nodes
              </CustomLink>
            </li>
          )}
          {!isAuthenticated ? (
            <li className={NavbarStyles.listItem}>
              <CustomLink to="/login" onClick={toggleMenu}>
                Login
              </CustomLink>
            </li>
          ) : (
            <li className={NavbarStyles.listItem}>
              <CustomLink to="/login" onClick={handleLogout}>
                Logout
              </CustomLink>
            </li>
          )}
          <li className={NavbarStyles.listItem}>
            <CustomLink to="/about" onClick={toggleMenu}>
              About
            </CustomLink>
          </li>
        </div>
      </ul>
    </nav>
  );
}
