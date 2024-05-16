import React, { useState, useEffect } from "react";
import { Link, useMatch, useResolvedPath } from "react-router-dom";
import NavbarStyles from "./navbar.module.css";
import logo from "../../resources/images/umu_coat.png";

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [animate, setAnimate] = useState(false);

    const toggleMenu = () => {
        if (!menuOpen) setAnimate(true);
        setMenuOpen(!menuOpen);
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) 
                setAnimate(false);
            setMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <nav className={NavbarStyles.navbar}>
            <Link to="/" className={`${NavbarStyles.logo} ${NavbarStyles.link}`}>
                <img src={logo} width={40} height={40} alt="University of Murcia logo" />
            </Link>
            <ul className={NavbarStyles.navlinks}>
                <input type="checkbox" id="menuToggle" className={NavbarStyles.checkbox_toggle} checked={menuOpen} onChange={toggleMenu} />
                <label htmlFor="menuToggle" className={NavbarStyles.hamburger}>&#9776;</label>
                <div className={`${NavbarStyles.menu} ${menuOpen && animate ? NavbarStyles.animate : ''}`}>
                <li className={NavbarStyles.listItem}>
                        <CustomLink to="/" onClick={toggleMenu}>Home</CustomLink>
                    </li>
                    <li className={NavbarStyles.listItem}>
                        <CustomLink to="/csvchecker" onClick={toggleMenu}>CSV checker</CustomLink>
                    </li>
                    <li className={NavbarStyles.listItem}>
                        <CustomLink to="/about" onClick={toggleMenu}>About</CustomLink>
                    </li>
                </div>
            </ul>
        </nav>
    );
}

function CustomLink({ to, children, onClick, ...props }) {
    const resolvedPath = useResolvedPath(to);
    const isActive = useMatch({ path: resolvedPath.pathname, end: true });

    return (
        <div className={isActive ? NavbarStyles.active : ""} onClick={onClick}>
            <Link to={to} {...props} className={NavbarStyles.link} style={{ display: 'block', width: '100%', height: '100%' }}>
                {children}
            </Link>
        </div>
    );
}
