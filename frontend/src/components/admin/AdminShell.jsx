import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { glassCardClass, MetaPill, Divider, glassButtonClass } from "./ui";
import logoImg from "../../img/logo.png";
import profilePic from "../../img/profile.jpeg";
import { SIDEBAR_LINKS, SidebarLink } from "./navigation";
import useAuth from "../../hooks/useAuth";

const bellIconClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:border-white/40 hover:text-white";

const FooterCard = () => (
  <div className={`${glassCardClass} p-5`}>
    <div className="text-sm font-semibold text-white/80">Need a hand?</div>
    <p className="mt-1 text-xs text-white/60">
      Our customer success engineers are available 24/7 to help the brand teams
      adopt ProductGuard across the supply chain.
    </p>
    <Link
      to="/support-dashboard"
      className={`${glassButtonClass} mt-4 w-full justify-center`}
    >
      Open Support Command Center
    </Link>
  </div>
);

const Sidebar = ({ onNavigate }) => (
  <aside className="hidden xl:flex xl:w-[19rem] xl:flex-col xl:border-r xl:border-white/10 xl:bg-black/30 xl:px-6 xl:py-8 xl:backdrop-blur-3xl">
    <div className="flex items-center justify-between gap-2">
      <img src={logoImg} alt="ProductGuard" className="h-10" />
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
        Admin
      </span>
    </div>
    <Divider className="my-6" />
    <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
      {SIDEBAR_LINKS.map((link) => (
        <SidebarLink key={link.label} {...link} onNavigate={onNavigate} />
      ))}
    </nav>
    <Divider className="my-6" />
    <FooterCard />
  </aside>
);

const MobileSidebar = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-50 h-full w-[18.5rem] bg-slate-950/90 px-6 py-8 shadow-2xl backdrop-blur-3xl">
        <button
          onClick={onClose}
          className="absolute right-6 top-5 text-white/60 transition hover:text-white"
          aria-label="Close navigation"
        >
          ✕
        </button>
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="ProductGuard" className="h-9" />
          <span className="text-sm font-semibold uppercase tracking-[0.45em] text-white/70">
            Admin
          </span>
        </div>
        <nav className="mt-8 space-y-1 overflow-y-auto pr-3">
          {SIDEBAR_LINKS.map((link) => (
            <SidebarLink key={link.label} {...link} onNavigate={onClose} />
          ))}
        </nav>
        <FooterCard />
      </div>
    </div>
  );
};

const ProfileAvatar = () => (
  <img
    src={profilePic}
    alt="Admin user"
    className="h-11 w-11 rounded-full border border-white/20 object-cover shadow-lg"
  />
);

const MetaRow = ({ meta }) => {
  if (!meta?.length) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2.5">
      {meta.map(({ icon, label, value, key, tone = "default" }) => (
        <MetaPill key={key || label} icon={icon} label={label} value={value} />
      ))}
    </div>
  );
};

const BackgroundOrbs = () => (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
    <div className="absolute top-1/3 right-[-12rem] h-[32rem] w-[32rem] rounded-full bg-indigo-500/20 blur-3xl" />
    <div className="absolute bottom-[-18rem] left-1/4 h-[28rem] w-[28rem] rounded-full bg-purple-500/20 blur-3xl" />
  </div>
);

const AdminShell = ({
  title,
  subtitle = null,
  meta = [],
  actions = null,
  toolbar = null,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { auth } = useAuth();
  const isAdmin = auth?.role === "admin";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  const titleId = useMemo(
    () => title?.toLowerCase().replace(/\s+/g, "-") || "admin",
    [title]
  );

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <BackgroundOrbs />
      {isAdmin ? (
        <>
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
          <MobileSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="xl:hidden fixed left-5 top-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-lg transition hover:border-white/40 hover:text-white"
            aria-label="Open navigation"
          >
            ☰
          </button>
        </>
      ) : null}
      <div className="flex flex-1 flex-col">
        <header
          className="sticky top-0 z-30 bg-black/40 px-6 pb-6 pt-24 backdrop-blur-3xl lg:px-10 xl:px-14"
          aria-labelledby={titleId}
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/50">
                {isAdmin ? "Control Tower" : "Workspace"}
              </p>
              <h1
                id={titleId}
                className="mt-3 text-3xl font-semibold tracking-tight text-white"
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-sm text-white/60">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {actions}
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    className={bellIconClass}
                    aria-label="Notifications"
                  >
                    🔔
                  </button>
                  <ProfileAvatar />
                </>
              ) : null}
            </div>
          </div>
          <MetaRow meta={meta} />
          {toolbar ? <div className="mt-6">{toolbar}</div> : null}
        </header>
        <main className="flex-1 space-y-10 px-6 pb-16 lg:px-10 xl:px-14">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
