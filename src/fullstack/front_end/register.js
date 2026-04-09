const { C, Logo, Input, Btn } = window;
const { useState } = React;

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={C.white}>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const ValidatedInput = ({ label, error, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
    <input
      {...props}
      style={{ width: "100%", background: C.bg, border: `1px solid ${error ? C.red : C.border}`, borderRadius: 6, padding: "12px 14px", color: C.white, outline: "none", fontSize: 14, transition: "border-color 0.15s" }}
      onFocus={e => !error && (e.target.style.borderColor = C.accent)}
      onBlur={e => !error && (e.target.style.borderColor = error ? C.red : C.border)}
    />
    {error && <div style={{ fontSize: 10, color: C.red, fontFamily: "'JetBrains Mono'", marginTop: 2 }}>⚠️ {error}</div>}
  </div>
);

const RegisterScreen = () => {
  const [step, setStep]         = useState('account');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', agree: false });
  const [smsCode, setSmsCode]   = useState(new Array(6).fill(""));
  const [errors, setErrors]     = useState({});
  const [passStrength, setPassStrength] = useState({ score: 0, text: 'Too Short', color: C.muted, bars: 0 });

  const handleNameChange = (e, field) => {
    const value = e.target.value;
    const nameRegex = /^[A-Za-z'-]*$/;
    const newErrors = { ...errors };
    if (!nameRegex.test(value)) {
      newErrors[field] = "Names cannot contain numbers or special symbols.";
    } else {
      delete newErrors[field];
    }
    setErrors(newErrors);
    setFormData({ ...formData, [field]: value });
  };

  const handlePasswordChange = (e) => {
    const pass = e.target.value;
    setFormData({ ...formData, password: pass });
    const newErrors = { ...errors };
    delete newErrors.password;

    if (!pass.length) {
      setPassStrength({ score: 0, text: 'Too Short', color: C.muted, bars: 0 });
      setErrors(newErrors);
      return;
    }
    if (pass.length < 8) {
      setPassStrength({ score: 1, text: 'Security Policy: Min 8 characters', color: C.red, bars: 1 });
      setErrors(newErrors);
      return;
    }

    let score = 1;
    if (/[a-z]/.test(pass))      score++;
    if (/[A-Z]/.test(pass))      score++;
    if (/[0-9]/.test(pass))      score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2)     setPassStrength({ score, text: 'Weak: Institutional Risk',  color: C.red,    bars: 1 });
    else if (score === 3) setPassStrength({ score, text: 'Fair: Vulnerable',           color: C.amber,  bars: 2 });
    else if (score === 4) setPassStrength({ score, text: 'Good: Acceptable',           color: C.blue,   bars: 3 });
    else                setPassStrength({ score, text: 'Strong: Secured',             color: C.accent, bars: 4 });

    setErrors(newErrors);
  };

  // POST /v1/auth/register — create user record, advance to phone binding on success
  const validateAndContinue = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex  = /^[A-Za-z'-]+$/;
    const finalErrors = {};

    if (!formData.firstName || !nameRegex.test(formData.firstName)) finalErrors.firstName = "Valid First Name is required.";
    if (!formData.lastName  || !nameRegex.test(formData.lastName))  finalErrors.lastName  = "Valid Last Name is required.";
    if (!formData.email     || !emailRegex.test(formData.email))    finalErrors.email     = "Institutional Email format is invalid.";
    if (passStrength.score < 4)                                     finalErrors.password  = "Security Policy: Password must be 'Good' strength or higher.";
    if (!formData.agree)                                             finalErrors.agree     = "Required.";

    setErrors(finalErrors);
    if (Object.keys(finalErrors).length > 0) return;

    // try {
    //   const res = await fetch('https://api.yourbackend.com/v1/auth/register', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ firstName: formData.firstName, lastName: formData.lastName, email: formData.email, password: formData.password })
    //   });
    //   if (!res.ok) throw new Error("Email may already exist");
    //   setStep('phone');
    // } catch (err) { alert(err.message); }

    setStep('phone');
  };

  // POST /v1/auth/send-sms — trigger SMS dispatch to the provided phone number
  const handleSendSMS = async () => {
    // try {
    //   await fetch('https://api.yourbackend.com/v1/auth/send-sms', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email: formData.email, phone: formData.phone })
    //   });
    //   setStep('verify');
    // } catch (err) { alert("Failed to send SMS"); }

    setStep('verify');
  };

  const handleCodeChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;
    const newCode = [...smsCode];
    newCode[index] = value.substring(value.length - 1);
    setSmsCode(newCode);
    if (value !== "" && index < 5) {
      document.getElementById(`reg-sms-${index + 1}`)?.focus();
    }
  };

  // POST /v1/auth/verify-sms — confirm phone ownership, finalize account and redirect
  const handleFinalize = async () => {
    const mfaCode = smsCode.join("");

    // try {
    //   const res = await fetch('https://api.yourbackend.com/v1/auth/verify-sms', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email: formData.email, phone: formData.phone, code: mfaCode })
    //   });
    //   const data = await res.json();
    //   if (data.token) {
    //     localStorage.setItem('jwt_token', data.token);
    //     localStorage.setItem('ob_user_name', formData.firstName);
    //     window.location.href = 'menu.html';
    //   } else { alert("Invalid verification code"); }
    // } catch (err) { console.error(err); }

    const userDB = JSON.parse(localStorage.getItem('ob_user_db') || '{}');
    userDB[formData.email.toLowerCase()] = formData.firstName;
    localStorage.setItem('ob_user_db', JSON.stringify(userDB));
    localStorage.setItem('ob_user_name', formData.firstName);
    window.location.href = 'menu.html';
  };

  // OAuth path — skip email/password, go straight to phone binding
  const handleOAuthRegister = () => setStep('phone');

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <Logo size={15} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Already have an account?</span>
          <Btn variant="ghost" onClick={() => window.location.href = 'login.html'}>Sign In</Btn>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.accent}08 0%, transparent 80%), ${C.bg}` }}>
        <div style={{ width: 460, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "40px 36px", boxShadow: `0 20px 60px rgba(0,0,0,.4)`, minHeight: "540px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <Logo size={18} />
          </div>

          {step === 'account' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ textAlign: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: C.white, marginBottom: 4 }}>Initialize Terminal Access</div>
                <div style={{ fontSize: 13, color: C.muted }}>Establish institutional identity to start analyzing prediction markets.</div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleOAuthRegister} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", color: "#3c4043", border: "1px solid #dadce0", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>
                  <GoogleIcon /> Google
                </button>
                <button onClick={handleOAuthRegister} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#24292e", color: C.white, border: "1px solid #444", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>
                  <GithubIcon /> GitHub
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>OR USE WORK EMAIL</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}><ValidatedInput label="First Name" placeholder="Jane" value={formData.firstName} onChange={e => handleNameChange(e, 'firstName')} error={errors.firstName} /></div>
                <div style={{ flex: 1 }}><ValidatedInput label="Last Name" placeholder="Doe" value={formData.lastName} onChange={e => handleNameChange(e, 'lastName')} error={errors.lastName} /></div>
              </div>

              <ValidatedInput label="Work Email" placeholder="trader@firm.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} error={errors.email} />
              <ValidatedInput label="Create Password" type="password" placeholder="••••••••" value={formData.password} onChange={handlePasswordChange} error={errors.password} />

              <div style={{ display: "flex", gap: 6, marginTop: -6 }}>
                {[1, 2, 3, 4].map(b => (
                  <div key={b} style={{ flex: 1, height: 4, background: b <= passStrength.bars ? passStrength.color : C.border, borderRadius: 2, transition: "background 0.2s" }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: passStrength.color, marginTop: -5, display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono'" }}>
                <span>Security Level:</span>
                <span style={{ fontWeight: 600 }}>{passStrength.text}</span>
              </div>

              <label style={{ fontSize: 12, color: errors.agree ? C.red : C.muted, display: "flex", gap: 8, alignItems: "center", marginTop: 6, transition: "color 0.15s" }}>
                <input type="checkbox" checked={formData.agree} onChange={e => setFormData({ ...formData, agree: e.target.checked })} style={{ accentColor: C.accent }} />
                I agree to the <span style={{ color: C.accent }}>Terms</span> and <span style={{ color: C.accent }}>Privacy Policy</span>.
              </label>
              {errors.agree && <div style={{ fontSize: 10, color: C.red, fontFamily: "'JetBrains Mono'" }}>⚠️ {errors.agree}</div>}

              <div style={{ marginTop: 10 }}>
                <Btn fullWidth onClick={validateAndContinue}>Continue →</Btn>
              </div>
            </div>
          )}

          {step === 'phone' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 4 }}>🔒</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: C.white, marginBottom: 8 }}>Mandatory System Security</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: "0 15px" }}>
                  To establish institutional access, OBAnalyzer requires 2FA on all accounts. Verify your phone number to proceed.
                </div>
              </div>

              <div style={{ width: "100%", display: "flex", gap: 10, marginTop: 10 }}>
                <div style={{ width: 90, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px", color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "'JetBrains Mono'" }}>US +1</div>
                <div style={{ flex: 1 }}>
                  <input
                    type="tel" placeholder="(555) 000-0000"
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 14px", color: C.white, outline: "none", fontSize: 14, fontFamily: "'JetBrains Mono'" }}
                  />
                </div>
              </div>

              <div style={{ width: "100%", marginTop: 10 }}>
                <Btn fullWidth onClick={handleSendSMS}>Initialize Verification</Btn>
              </div>
              <span style={{ fontSize: 12, color: C.muted, cursor: "pointer", marginTop: 10 }} onClick={() => setStep('account')}>← Back</span>
            </div>
          )}

          {step === 'verify' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ textAlign: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: C.white, marginBottom: 8 }}>Identity Confirmation</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
                  Enter the 6-digit access token sent via SMS to finalize terminal access.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "10px 0" }}>
                {smsCode.map((digit, i) => (
                  <input
                    key={i} id={`reg-sms-${i}`} type="text" maxLength="1" value={digit}
                    onChange={e => handleCodeChange(e, i)}
                    style={{ width: 44, height: 52, background: C.bg, border: `1px solid ${digit !== "" ? C.accent : C.border}`, borderRadius: 8, textAlign: "center", fontFamily: "'JetBrains Mono'", fontSize: 24, fontWeight: 600, color: C.accent, outline: "none", transition: "border-color 0.2s" }}
                  />
                ))}
              </div>

              <div style={{ textAlign: "center", fontSize: 12, color: C.muted }}>
                Consumer Lag: <span style={{ fontFamily: "'JetBrains Mono'", color: C.accent }}>3.1s</span> | <span style={{ color: C.accent, cursor: "pointer" }}>Resend Token</span>
              </div>

              <div style={{ marginTop: 10 }}>
                <Btn fullWidth onClick={handleFinalize}>Finalize & Access Terminal</Btn>
              </div>

              <div style={{ textAlign: "center", marginTop: 4 }}>
                <span style={{ fontSize: 12, color: C.muted, cursor: "pointer" }} onClick={() => setStep('phone')}>← Change identification number</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<RegisterScreen />);