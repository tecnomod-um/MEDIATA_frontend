import React, { useState , useRef} from "react";
import { useNavigate } from "react-router-dom";
import LoginStyles from "./login.module.css";
import { loginUser } from "../../util/petitionHandler";
import { useAuth } from "../../context/authContext";
import { CSSTransition } from "react-transition-group";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const formRef = useRef(null); 
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
        navigate("/projects");
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
        nodeRef={formRef}
      >
        <form 
          ref={formRef} 
          className={LoginStyles.form} 
          onSubmit={handleLogin}
          aria-labelledby="login-title"
          noValidate
        >
          <h2 id="login-title" className={LoginStyles.title}>Login</h2>
          <input
            type="text"
            id="username-input"
            name="username"
            className={LoginStyles.input}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            aria-label="Username"
            aria-required="true"
            aria-invalid={errorMessage ? "true" : "false"}
            aria-describedby={errorMessage ? "login-error" : undefined}
          />
          <input
            type="password"
            id="password-input"
            name="password"
            className={LoginStyles.input}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            aria-label="Password"
            aria-required="true"
            aria-invalid={errorMessage ? "true" : "false"}
            aria-describedby={errorMessage ? "login-error" : undefined}
          />
          {errorMessage && (
            <div 
              id="login-error" 
              className={LoginStyles.error} 
              role="alert"
              aria-live="polite"
            >
              {errorMessage}
            </div>
          )}
          <button
            type="submit"
            id="login-submit-button"
            className={LoginStyles.button}
            disabled={isLoggingIn}
            aria-busy={isLoggingIn}
            aria-label={isLoggingIn ? "Logging in, please wait" : "Login to your account"}
          >
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>
        </form>
      </CSSTransition>
    </div>
  );
};

export default Login;
