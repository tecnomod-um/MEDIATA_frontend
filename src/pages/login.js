import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginStyles from "./login.module.css";
import { loginUser } from "../util/petitionHandler";
import { useAuth } from "../context/authContext";
import { CSSTransition } from "react-transition-group";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMessage("");

    try {
      const data = await loginUser(username, password);
      login(data.token, data.tgt);
      setIsLoggingIn(false);
      navigate("/nodes");
    } catch (error) {
      console.log(error);
      setErrorMessage("Login failed. Please check your credentials.");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={LoginStyles.container}>
      <CSSTransition
        in={true}
        appear={true}
        timeout={500}
        classNames={LoginStyles}
      >
        <form className={LoginStyles.form} onSubmit={handleLogin}>
          <h2 className={LoginStyles.title}>Login</h2>
          <input
            type="text"
            className={LoginStyles.input}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <input
            type="password"
            className={LoginStyles.input}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {errorMessage && (
            <div className={LoginStyles.error}>{errorMessage}</div>
          )}
          <button
            type="submit"
            className={LoginStyles.button}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>
        </form>
      </CSSTransition>
    </div>
  );
};

export default Login;
