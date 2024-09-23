import React from "react";
import NavbarStyles from "./navbar.module.css";
import { Link, useMatch, useResolvedPath } from "react-router-dom";

function CustomLink({ to, children, onClick, noToggle, ...props }) {
    const resolvedPath = useResolvedPath(to);
    const isActive = useMatch({ path: resolvedPath.pathname, end: true });

    const handleClick = (e) => {
        if (onClick && !noToggle) {
            onClick(e);
        }
    };

    return (
        <div className={isActive ? NavbarStyles.active : ""} onClick={handleClick}>
            <Link to={to} {...props} className={NavbarStyles.link} style={{ display: 'block', width: '100%', height: '100%' }}>
                {children}
            </Link>
        </div>
    );
}

export default CustomLink;
