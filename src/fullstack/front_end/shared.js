window.C = {
  bg: "#0a0e14", surface: "#111820", border: "#1e2d3d",
  accent: "#00d084", accentD: "#00a866", amber: "#f5a623",
  red: "#ff4d6d", blue: "#6eb5ff", purple: "#b97cff",
  text: "#c9d8e8", muted: "#4a6070", white: "#e8f4ff"
};

window.Logo = ({ size = 16 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <svg width={size * 1.6} height={size * 1.6} viewBox="0 0 26 26">
      <rect x="1"  y="10" width="4" height="14" fill={window.C.accent} rx="1" />
      <rect x="7"  y="6"  width="4" height="18" fill={window.C.accent} opacity=".7" rx="1" />
      <rect x="13" y="2"  width="4" height="22" fill={window.C.accent} rx="1" />
      <rect x="19" y="8"  width="4" height="16" fill={window.C.accent} opacity=".5" rx="1" />
    </svg>
    <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 600, fontSize: size, color: window.C.white, letterSpacing: 1 }}>
      OB<span style={{ color: window.C.accent }}>Analyzer</span>
    </span>
  </div>
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