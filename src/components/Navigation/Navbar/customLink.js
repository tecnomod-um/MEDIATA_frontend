import React from "react";
import NavbarStyles from "./navbar.module.css";
import { Link, useMatch, useResolvedPath } from "react-router-dom";

function CustomLink({ to, children, onClick, noToggle, reloadOnActive = false, ...props }) {
  const resolvedPath = useResolvedPath(to);
  const isActive = useMatch({ path: resolvedPath.pathname, end: true });

  const handleClick = (e) => {
    if (reloadOnActive && isActive) {
      e.preventDefault();
      window.location.reload();
      return;
    }
    if (onClick && !noToggle) onClick(e);
  };

  return (
    <div className={isActive ? NavbarStyles.active : ""}>
      <Link
        to={to}
        {...props}
        onClick={handleClick}
        className={NavbarStyles.link}
        style={{ display: "block", width: "100%", height: "100%" }}
        aria-current={isActive ? "page" : undefined}
      >
        {children}
      </Link>
    </div>
  );
}

export default CustomLink;