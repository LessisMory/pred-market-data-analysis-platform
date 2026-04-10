const { C, Logo, Btn, Tag } = window;
const { useState, useEffect } = React;

const ProfileScreen = () => {
  const [userName, setUserName]   = useState("Trader");
  const [activeTab, setActiveTab] = useState('edit_profile');
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    email: "trader@example.com", memberSince: "Nov 2025",
    snapshots: "0", replays: "0", tickers: "0", daysActive: "0"
  });
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const savedName = localStorage.getItem('ob_user_name');
    if (savedName) setUserName(savedName);
  }, []);

  // GET /v1/user/profile + GET /v1/user/activities — load account stats and activity log
  useEffect(() => {
    const fetchProfileData = async () => {
      // try {
      //   const headers = { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` };
      //   const [profileRes, activityRes] = await Promise.all([
      //     fetch('https://api.yourbackend.com/v1/user/profile', { headers }),
      //     fetch('https://api.yourbackend.com/v1/user/activities', { headers })
      //   ]);
      //   setUserStats(await profileRes.json());
      //   setActivities(await activityRes.json());
      //   setIsLoading(false);
      // } catch (err) { console.error(err); }

      setTimeout(() => {
        setUserStats({ email: "trader@example.com", memberSince: "Nov 2025", snapshots: "1,240", replays: "87", tickers: "6", daysActive: "98" });
        setActivities([
          { date: "Mar 1, 2026",  event: "Pro plan renewed" },
          { date: "Feb 22, 2026", event: "Password changed" },
          { date: "Feb 5, 2026",  event: "CSV export downloaded" },
          { date: "Dec 3, 2025",  event: "Upgraded Free → Pro" },
          { date: "Nov 20, 2025", event: "Account created" }
        ]);
        setIsLoading(false);
      }, 600);
    };

    fetchProfileData();
  }, []);

  // PUT /v1/user/update — persist first/last name change; sync localStorage display name
  const handleSaveChanges = async () => {
    const firstName = document.getElementById("input-fname").value;
    const lastName  = document.getElementById("input-lname").value;
    const newName   = `${firstName} ${lastName}`.trim();

    // try {
    //   await fetch('https://api.yourbackend.com/v1/user/update', {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
    //     body: JSON.stringify({ firstName, lastName })
    //   });
    // } catch (err) { console.error(err); return; }

    setUserName(newName);
    localStorage.setItem('ob_user_name', newName);
    alert("Profile updated successfully!");
  };

  const userHandle = `@${userName.toLowerCase().replace(/\s+/g, '')}`;

  const sidebarMenu = [
    { id: 'edit_profile',    label: 'Edit Profile' },
    { id: 'change_password', label: 'Change Password' },
    { id: 'update_email',    label: 'Update Email' },
    { id: 'notifications',   label: 'Notifications' },
    { id: 'api_keys',        label: 'API Keys' },
    { id: 'delete_account',  label: 'Delete Account', isDanger: true }
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.white, fontFamily: "'DM Sans'" }}>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(18,18,18,0.8)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.border}`, zIndex: 100 }}>
        <Logo size={14} />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>← Menu</Btn>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 12px", background: `${C.accent}10`, borderRadius: 20, border: `1px solid ${C.accent}30` }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{userName}</span>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.accent, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{userName[0]}</div>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: "40px 32px", maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", gap: 32 }}>

        <aside style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12, paddingLeft: 12 }}>ACCOUNT SETTINGS</div>
            {sidebarMenu.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{ textAlign: "left", padding: "12px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.2s", background: activeTab === item.id ? C.surface : "transparent", color: item.isDanger ? C.red : (activeTab === item.id ? C.white : C.muted), borderLeft: activeTab === item.id ? `3px solid ${item.isDanger ? C.red : C.accent}` : `3px solid transparent` }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginTop: "auto" }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>CURRENT PLAN</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Pro</span>
              <Tag color={C.accent}>ACTIVE</Tag>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>$9.99 / month</div>
            <Btn fullWidth onClick={() => window.location.href = 'membership.html'} style={{ fontSize: 12, padding: "8px" }}>
              Upgrade to Elite
            </Btn>
          </div>
        </aside>

        <section style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, boxShadow: `0 0 30px ${C.accent}40` }}>
              {userName[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <h1 style={{ fontSize: 28, margin: 0, fontWeight: 700 }}>{userName}</h1>
                <Tag color={C.accent}>PRO</Tag>
              </div>
              <div style={{ fontSize: 14, color: C.muted, display: "flex", gap: 16 }}>
                <span>{userStats.email}</span>
                <span>{userHandle}</span>
                <span>Member since {userStats.memberSince}</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, color: C.muted }}>
              Loading analytics from server...
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {[
                { val: userStats.snapshots,  label: "Snapshots Viewed" },
                { val: userStats.replays,    label: "Replays Run" },
                { val: userStats.tickers,    label: "Saved Tickers" },
                { val: userStats.daysActive, label: "Days Active" }
              ].map((stat, i) => (
                <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: C.white, marginBottom: 4 }}>{stat.val}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 24, flex: 1 }}>

            <div style={{ flex: 1.5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
              <h3 style={{ fontSize: 18, margin: "0 0 24px 0" }}>{sidebarMenu.find(m => m.id === activeTab)?.label}</h3>

              {activeTab === 'edit_profile' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 8 }}>FIRST NAME</label>
                      <input id="input-fname" type="text" defaultValue={userName.split(' ')[0] || ''} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: "none" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 8 }}>LAST NAME</label>
                      <input id="input-lname" type="text" defaultValue={userName.split(' ').slice(1).join(' ') || ''} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: "none" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 8 }}>USERNAME</label>
                    <input type="text" disabled defaultValue={userHandle} style={{ width: "100%", background: `${C.bg}80`, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.muted, outline: "none", cursor: "not-allowed" }} />
                  </div>
                  <Btn style={{ marginTop: 16, alignSelf: "flex-start" }} onClick={handleSaveChanges}>Save Changes</Btn>
                </div>
              )}

              {activeTab !== 'edit_profile' && (
                <div style={{ color: C.muted, fontSize: 14, padding: "40px 0", textAlign: "center" }}>
                  <span style={{ fontSize: 32, display: "block", marginBottom: 16 }}>⚙️</span>
                  Settings for {sidebarMenu.find(m => m.id === activeTab)?.label} will connect to the backend API.
                </div>
              )}
            </div>

            <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>RECENT ACTIVITY</div>
              </div>

              {isLoading ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 12 }}>
                  Loading logs...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
                  <div style={{ position: "absolute", left: 5, top: 10, bottom: 10, width: 1, background: C.border }} />
                  {activities.map((act, i) => (
                    <div key={i} style={{ display: "flex", gap: 16, position: "relative" }}>
                      <div style={{ width: 11, height: 11, borderRadius: "50%", background: i === 0 ? C.accent : C.surface, border: `2px solid ${C.bg}`, zIndex: 1, marginTop: 4 }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: i === 0 ? C.white : C.muted }}>{act.event}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{act.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </section>

      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<ProfileScreen />);