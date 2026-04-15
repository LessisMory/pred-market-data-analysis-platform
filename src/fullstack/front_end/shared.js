window.C = {
  bg: "#0a0e14", surface: "#111820", border: "#1e2d3d",
  accent: "#00d084", accentD: "#00a866", amber: "#f5a623",
  red: "#ff4d6d", blue: "#6eb5ff", purple: "#b97cff",
  text: "#c9d8e8", muted: "#4a6070", white: "#e8f4ff"
};

window.Logo = ({ size = 16 }) => (
  <button
    type="button"
    onClick={() => window.location.href = 'menu.html'}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "transparent",
      border: "none",
      padding: 0,
      cursor: "pointer"
    }}
    aria-label="Go to menu"
    title="Back to menu"
  >
    <svg width={size * 1.6} height={size * 1.6} viewBox="0 0 26 26">
      <rect x="1"  y="10" width="4" height="14" fill={window.C.accent} rx="1" />
      <rect x="7"  y="6"  width="4" height="18" fill={window.C.accent} opacity=".7" rx="1" />
      <rect x="13" y="2"  width="4" height="22" fill={window.C.accent} rx="1" />
      <rect x="19" y="8"  width="4" height="16" fill={window.C.accent} opacity=".5" rx="1" />
    </svg>
    <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 600, fontSize: size, color: window.C.white, letterSpacing: 1 }}>
      OB<span style={{ color: window.C.accent }}>Analyzer</span>
    </span>
  </button>
);

window.Tag = ({ children, color }) => {
  const col = color || window.C.accent;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono'", fontSize: 10, color: col,
      background: `${col}18`, border: `1px solid ${col}40`,
      borderRadius: 4, padding: "2px 8px", letterSpacing: 1
    }}>
      {children}
    </span>
  );
};

window.Input = ({ label, type = "text", placeholder, icon, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 12, color: window.C.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>
    <div style={{ position: "relative" }}>
      {icon && (
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: window.C.muted, fontSize: 14 }}>
          {icon}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        {...props}
        style={{
          width: "100%", background: window.C.bg, border: `1px solid ${window.C.border}`,
          borderRadius: 6, padding: icon ? "10px 12px 10px 36px" : "10px 12px",
          color: window.C.text, fontSize: 14, outline: "none", transition: "border-color .2s"
        }}
        onFocus={e => e.target.style.borderColor = window.C.accent}
        onBlur={e => e.target.style.borderColor = window.C.border}
      />
    </div>
  </div>
);

window.Btn = ({ children, variant = "primary", onClick, fullWidth, style, disabled, ...props }) => {
  const styles = {
    primary: { background: disabled ? window.C.muted : window.C.accent, color: "#000", fontWeight: 600 },
    ghost:   { background: "transparent", color: disabled ? window.C.muted : window.C.text, border: `1px solid ${window.C.border}` }
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...props}
      style={{
        ...styles[variant],
        padding: "11px 22px", borderRadius: 6, fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : "auto",
        border: styles[variant].border || "none",
        transition: "opacity .15s", fontFamily: "'DM Sans'",
        ...style
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = ".85")}
      onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = "1")}
    >
      {children}
    </button>
  );
};

window.candleData  = [38,42,40,55,50,62,58,70,65,72,68,75,71,80,77,85,82,78,84,88,83,91,87,94,90,96,92,88,95,97];
window.probHistory = [55,57,53,60,62,58,61,65,63,67,64,66,68,62,65,69,70,67,71,68,72,70,68,73,75,72,74,71,73,62];


window.showSuccessToast = (message = "SYSTEM: Auth successful. Welcome back.") => {
  const C = window.C;
  const toast = document.createElement('div');
  
  Object.assign(toast.style, {
    position: 'fixed',
    top: '24px',
    right: '24px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderLeft: `4px solid ${C.accent}`, 
    borderRadius: '8px',
    padding: '16px 20px',
    color: C.white,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '14px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 9999,
    opacity: '0',
    transform: 'translateY(-10px)',
    transition: 'all 0.3s ease'
  });

  toast.innerHTML = `
    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${C.accent}; box-shadow: 0 0 8px ${C.accent};"></div>
    <div>${message}</div>
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300); 
  }, 2500);
};


window.showErrorModal = (message = "SYSTEM ERROR: Action failed.") => {
  const C = window.C;

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0, left: 0, width: '100vw', height: '100vh',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000,
    opacity: '0', transition: 'opacity 0.2s ease'
  });

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    width: '360px',
    background: C.surface,
    border: `1px solid ${C.red}40`,
    borderTop: `4px solid ${C.red}`,
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
    transform: 'scale(0.9)',
    transition: 'transform 0.2s ease'
  });

  modal.innerHTML = `
    <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
    <div style="font-family: 'DM Sans'; font-weight: 600; font-size: 18px; color: ${C.white}; margin-bottom: 12px;">Security Alert</div>
    <div style="font-family: 'JetBrains Mono'; font-size: 13px; color: ${C.muted}; line-height: 1.6; margin-bottom: 24px; word-break: break-word;">
      ${message}
    </div>
    <button id="close-error-modal" style="
      background: transparent; 
      border: 1px solid ${C.border}; 
      color: ${C.white}; 
      padding: 10px 24px; 
      border-radius: 6px; 
      cursor: pointer; 
      font-family: 'DM Sans';
      font-size: 14px;
      transition: all 0.2s;
    ">Dismiss</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });

  const closeModal = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  modal.querySelector('#close-error-modal').onclick = closeModal;
  modal.querySelector('#close-error-modal').onmouseenter = (e) => e.target.style.background = C.border;
  modal.querySelector('#close-error-modal').onmouseleave = (e) => e.target.style.background = 'transparent';
};