"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import "./AuthScreen.css";

export type AuthTab = "login" | "signup";

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
};

export type AuthScreenProps = {
  initialTab?: AuthTab;
  loading?: boolean;
  infoMessage?: string;
  errorMessage?: string;
  onLogin: (payload: LoginPayload) => Promise<void>;
  onSignup: (payload: SignupPayload) => Promise<void>;
  onGoogle: () => Promise<void>;
  onTabChange?: (tab: AuthTab) => void;
};

type LoginErrors = Partial<Record<keyof LoginPayload, string>>;
type SignupErrors = Partial<Record<keyof SignupPayload, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());

export const AuthScreen = ({
  initialTab = "login",
  loading = false,
  infoMessage,
  errorMessage,
  onLogin,
  onSignup,
  onGoogle,
  onTabChange
}: AuthScreenProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [loginData, setLoginData] = useState<LoginPayload>({
    email: "",
    password: ""
  });
  const [signupData, setSignupData] = useState<SignupPayload>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    terms: false
  });
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({});

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const gl = canvas.getContext("webgl");
    if (!gl) {
      return;
    }

    const vertexSource = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    const fragmentSource = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;

      void main() {
        vec2 c = (2.0 * gl_FragCoord.xy - iResolution.xy) / min(iResolution.x, iResolution.y);
        float t = iTime * 0.18;
        vec2 mouse = 1.2 * iMouse / iResolution - 0.6;
        vec2 d = c;
        for (float i = 1.0; i < 7.0; i++) {
          d.x += 0.45 / i * cos(i * 2.1 * d.y + t + mouse.x * 0.9);
          d.y += 0.45 / i * cos(i * 2.1 * d.x + t + mouse.y * 0.9);
        }
        float w = abs(sin(d.x + d.y + t));
        float g = smoothstep(0.9, 0.2, w);
        vec3 col = vec3(0.05, 0.12, 0.34) * g;
        col += vec3(0.02, 0.04, 0.09) * smoothstep(0.5, 0.0, w);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) {
        return null;
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionAttribute = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttribute);
    gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uMouse = gl.getUniformLocation(program, "iMouse");

    if (!uResolution || !uTime || !uMouse) {
      return;
    }

    let pointerX = 0;
    let pointerY = 0;
    let frameId = 0;
    const start = performance.now();

    const getDpr = () => Math.min(window.devicePixelRatio || 1, 2);

    const handleMouseMove = (event: MouseEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    };

    const resize = () => {
      const dpr = getDpr();
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = () => {
      const elapsed = (performance.now() - start) / 1000;
      const dpr = getDpr();

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, pointerX * dpr, canvas.height - pointerY * dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      frameId = window.requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", resize);
    resize();
    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setLoginErrors({});
    setSignupErrors({});
    onTabChange?.(tab);
  };

  const preventAnchorNavigation = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  };

  const validateLogin = () => {
    const errors: LoginErrors = {};

    if (!loginData.email.trim()) {
      errors.email = "Informe seu e-mail.";
    } else if (!isValidEmail(loginData.email)) {
      errors.email = "Informe um e-mail valido.";
    }

    if (!loginData.password) {
      errors.password = "Informe sua senha.";
    } else if (loginData.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = "A senha precisa ter ao menos 8 caracteres.";
    }

    return errors;
  };

  const validateSignup = () => {
    const errors: SignupErrors = {};

    if (!signupData.firstName.trim()) {
      errors.firstName = "Informe seu nome.";
    }

    if (!signupData.lastName.trim()) {
      errors.lastName = "Informe seu sobrenome.";
    }

    if (!signupData.email.trim()) {
      errors.email = "Informe seu e-mail corporativo.";
    } else if (!isValidEmail(signupData.email)) {
      errors.email = "Informe um e-mail valido.";
    }

    if (!signupData.password) {
      errors.password = "Informe uma senha.";
    } else if (signupData.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = "A senha precisa ter ao menos 8 caracteres.";
    }

    if (!signupData.terms) {
      errors.terms = "Voce precisa aceitar os termos.";
    }

    return errors;
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLogin();
    setLoginErrors(errors);

    if (Object.keys(errors).length === 0) {
      await onLogin(loginData);
    }
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateSignup();
    setSignupErrors(errors);

    if (Object.keys(errors).length === 0) {
      await onSignup(signupData);
    }
  };

  return (
    <div className="auth-root">
      <canvas ref={canvasRef} id="auth-bg-canvas" aria-hidden />
      <div className="auth-grain" aria-hidden />

      <div className="auth-scene">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-brand-icon" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path d="M12 3L5.3 21h2.9l1.3-3.8h5l1.3 3.8h2.9L12 3zm-1.7 11.7L12 9.5l1.7 5.2h-3.4z" />
                <circle cx="18.4" cy="6.2" r="1.6" />
              </svg>
            </div>
            <div className="auth-brand-name">
              Aithos <span>Sales</span>
            </div>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Acesso de conta">
            <button
              type="button"
              className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
              role="tab"
              aria-selected={activeTab === "login"}
              onClick={() => switchTab("login")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`auth-tab ${activeTab === "signup" ? "active" : ""}`}
              role="tab"
              aria-selected={activeTab === "signup"}
              onClick={() => switchTab("signup")}
            >
              Criar Conta
            </button>
          </div>

          {errorMessage ? <p className="auth-field-error">{errorMessage}</p> : null}
          {infoMessage ? <p className="auth-subheading">{infoMessage}</p> : null}

          <section className={`auth-panel ${activeTab === "login" ? "active" : ""}`}>
            <h1 className="auth-heading">Bem-vindo de volta.</h1>
            <p className="auth-subheading">Acesse sua conta para continuar gerenciando suas vendas.</p>

            <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="auth-login-email">E-mail</label>
                <div className="auth-input-wrap">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    id="auth-login-email"
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    value={loginData.email}
                    aria-invalid={Boolean(loginErrors.email)}
                    onChange={(event) =>
                      setLoginData((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </div>
                {loginErrors.email ? <p className="auth-field-error">{loginErrors.email}</p> : null}
              </div>

              <div className="auth-field">
                <label htmlFor="auth-login-password">Senha</label>
                <div className="auth-input-wrap">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="auth-login-password"
                    type="password"
                    placeholder="********"
                    autoComplete="current-password"
                    value={loginData.password}
                    aria-invalid={Boolean(loginErrors.password)}
                    onChange={(event) =>
                      setLoginData((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </div>
                {loginErrors.password ? (
                  <p className="auth-field-error">{loginErrors.password}</p>
                ) : null}
              </div>

              <div className="auth-forgot-row">
                <a href="#" onClick={preventAnchorNavigation}>
                  Esqueci minha senha
                </a>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
                <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            <div className="auth-divider">
              <span>ou continue com</span>
            </div>

            <button
              type="button"
              className="auth-btn-google"
              onClick={() => onGoogle()}
              disabled={loading}
            >
              <svg viewBox="0 0 48 48" aria-hidden>
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"
                />
              </svg>
              Entrar com Google
            </button>
          </section>

          <section className={`auth-panel ${activeTab === "signup" ? "active" : ""}`}>
            <h1 className="auth-heading">Comece hoje.</h1>
            <p className="auth-subheading">Crie sua conta e turbine suas vendas com inteligencia.</p>

            <form className="auth-form" onSubmit={handleSignupSubmit} noValidate>
              <div className="auth-field-row">
                <div className="auth-field">
                  <label htmlFor="auth-signup-first-name">Nome</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-signup-first-name"
                      type="text"
                      placeholder="Joao"
                      autoComplete="given-name"
                      value={signupData.firstName}
                      aria-invalid={Boolean(signupErrors.firstName)}
                      onChange={(event) =>
                        setSignupData((current) => ({
                          ...current,
                          firstName: event.target.value
                        }))
                      }
                    />
                  </div>
                  {signupErrors.firstName ? (
                    <p className="auth-field-error">{signupErrors.firstName}</p>
                  ) : null}
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-signup-last-name">Sobrenome</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-signup-last-name"
                      type="text"
                      placeholder="Silva"
                      autoComplete="family-name"
                      value={signupData.lastName}
                      aria-invalid={Boolean(signupErrors.lastName)}
                      onChange={(event) =>
                        setSignupData((current) => ({
                          ...current,
                          lastName: event.target.value
                        }))
                      }
                    />
                  </div>
                  {signupErrors.lastName ? (
                    <p className="auth-field-error">{signupErrors.lastName}</p>
                  ) : null}
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="auth-signup-email">E-mail corporativo</label>
                <div className="auth-input-wrap">
                  <input
                    id="auth-signup-email"
                    type="email"
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    value={signupData.email}
                    aria-invalid={Boolean(signupErrors.email)}
                    onChange={(event) =>
                      setSignupData((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </div>
                {signupErrors.email ? <p className="auth-field-error">{signupErrors.email}</p> : null}
              </div>

              <div className="auth-field">
                <label htmlFor="auth-signup-password">Senha</label>
                <div className="auth-input-wrap">
                  <input
                    id="auth-signup-password"
                    type="password"
                    placeholder="Minimo 8 caracteres"
                    autoComplete="new-password"
                    value={signupData.password}
                    aria-invalid={Boolean(signupErrors.password)}
                    onChange={(event) =>
                      setSignupData((current) => ({
                        ...current,
                        password: event.target.value
                      }))
                    }
                  />
                </div>
                {signupErrors.password ? (
                  <p className="auth-field-error">{signupErrors.password}</p>
                ) : null}
              </div>

              <div className="auth-check-row">
                <input
                  type="checkbox"
                  id="auth-terms"
                  checked={signupData.terms}
                  onChange={(event) =>
                    setSignupData((current) => ({ ...current, terms: event.target.checked }))
                  }
                />
                <label htmlFor="auth-terms">
                  Concordo com os <a href="#" onClick={preventAnchorNavigation}>Termos de Uso</a> e a{" "}
                  <a href="#" onClick={preventAnchorNavigation}>Politica de Privacidade</a> da Aithos Sales.
                </label>
              </div>
              {signupErrors.terms ? (
                <p className="auth-field-error auth-terms-error">{signupErrors.terms}</p>
              ) : null}

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? "Criando..." : "Criar Conta"}
                <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            <div className="auth-divider">
              <span>ou cadastre com</span>
            </div>

            <button
              type="button"
              className="auth-btn-google"
              onClick={() => onGoogle()}
              disabled={loading}
            >
              Cadastrar com Google
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
