import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRightLeft,
  BadgeCheck,
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  Clipboard,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  Home,
  Info,
  KeyRound,
  Menu,
  Moon,
  Network,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react';
import type { Actor, Event, Lot, Role, VerifyCheck } from './types';
import { devAccounts, eventLabels, roleLabels } from './types';
import {
  getActiveActor,
  getStoredActors,
  getStoredLots,
  saveActor,
  saveLot,
  setActiveActor,
} from './storage';
import { shortAddress, shortHash } from './utils';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextValue {
  actors: Actor[];
  lots: Lot[];
  activeActor: string;
  setActiveActorAddress: (address: string) => void;
  rememberActor: (actor: Actor) => void;
  rememberLot: (lot: Lot) => void;
  toast: ToastMessage | null;
  showToast: (toast: ToastMessage) => void;
}

import { createContext, useContext } from 'react';

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppShell');
  return value;
}

export function AppShell(): ReactNode {
  const [actors, setActors] = useState<Actor[]>(getStoredActors);
  const [lots, setLots] = useState<Lot[]>(getStoredLots);
  const [activeActor, setActiveActorState] = useState(
    () => getActiveActor() || devAccounts[0]?.address || '',
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = window.localStorage.getItem('pharma-chain-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('pharma-chain-theme', theme);
  }, [theme]);

  const rememberActor = (actor: Actor) => setActors(saveActor(actor));
  const rememberLot = (lot: Lot) => setLots(saveLot(lot));
  const setActiveActorAddress = (address: string) => {
    setActiveActor(address);
    setActiveActorState(address);
  };

  const contextValue: AppContextValue = {
    actors,
    lots,
    activeActor,
    setActiveActorAddress,
    rememberActor,
    rememberLot,
    toast,
    showToast: setToast,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-frame">
        <div className="prototype-banner">
          <Sparkles size={15} aria-hidden="true" />
          Prototipo académico · datos ficticios · no apto para producción
        </div>
        <header className="topbar">
          <div className="topbar-inner">
            <button className="mobile-menu" type="button" aria-label="Abrir menú" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={21} />
            </button>
            <NavLink className="brand" to="/">
              <span className="brand-mark"><ShieldCheck size={22} /></span>
              <span><strong>Pharma Chain</strong><small>Trazabilidad PQC</small></span>
            </NavLink>
            <div className="topbar-context">
              <div className="actor-switcher">
                <label htmlFor="active-actor">Simulador de sesión · actuar como</label>
                <select id="active-actor" value={activeActor} onChange={(event) => setActiveActorAddress(event.target.value)}>
                  {devAccounts.map((account) => {
                    const registered = actors.find((actor) => actor.address === account.address);
                    return (
                      <option key={account.address} value={account.address}>
                        {account.label} · {registered ? roleLabels[registered.role] : 'sin registrar'}
                      </option>
                    );
                  })}
                  {actors.filter((actor) => !devAccounts.some((account) => account.address === actor.address)).map((actor) => (
                    <option key={actor.address} value={actor.address}>{actor.displayName || 'Actor registrado'} · {roleLabels[actor.role]}</option>
                  ))}
                </select>
                <span className="field-hint">La app gestiona la dirección y la clave por ti. No es autenticación real.</span>
              </div>
              <button className="theme-toggle" type="button" aria-label={theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'} aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Modo día' : 'Modo noche'}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </header>
        <div className={`workspace ${menuOpen ? 'menu-visible' : ''}`}>
          <aside className="sidebar">
            <nav aria-label="Navegación principal" onClick={() => setMenuOpen(false)}>
              <NavSection label="Operación">
                <NavItem to="/" icon={<Home size={17} />} label="Recorrido guiado" end />
                <NavItem to="/actors" icon={<Users size={17} />} label="Actores" />
                <NavItem to="/lots/new" icon={<Boxes size={17} />} label="Crear lote" />
                <NavItem to="/transfer" icon={<ArrowRightLeft size={17} />} label="Transferir custodia" />
              </NavSection>
              <NavSection label="Evidencia">
                <NavItem to="/verify" icon={<FileCheck2 size={17} />} label="Verificación" />
                <NavItem to="/measurements" icon={<Gauge size={17} />} label="Mediciones" />
              </NavSection>
              <NavSection label="Ayuda">
                <NavItem to="/limitations" icon={<BookOpen size={17} />} label="Limitaciones" />
                <NavItem to="/settings" icon={<Settings2 size={17} />} label="Ajustes del entorno" />
              </NavSection>
            </nav>
            <div className="sidebar-footnote">
              <div className="environment-status"><span className="status-dot" />API conectada</div>
              <span><Activity size={15} />Red local Hardhat<br /><small>Eventos ML-DSA · hashes en cadena</small></span>
            </div>
          </aside>
          <main className="main-content"><Outlet /></main>
        </div>
        {toast ? <Toast toast={toast} onClose={() => setToast(null)} /> : null}
      </div>
    </AppContext.Provider>
  );
}

function NavItem({ to, icon, label, end = false }: { to: string; icon: ReactNode; label: string; end?: boolean }) {
  return <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>{icon}<span>{label}</span></NavLink>;
}

function NavSection({ label, children }: { label: string; children: ReactNode }) {
  return <div className="nav-section"><span className="nav-section-label">{label}</span>{children}</div>;
}

function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const Icon = toast.type === 'success' ? Check : toast.type === 'error' ? CircleAlert : Info;
  return <div className={`toast toast-${toast.type}`} role="status"><Icon size={18} /><span>{toast.message}</span><button type="button" aria-label="Cerrar aviso" onClick={onClose}><X size={16} /></button></div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{action ? <div className="header-action">{action}</div> : null}</div>;
}

export function Panel({ children, className = '', ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return <section className={`panel ${className}`} {...props}>{children}</section>;
}

export function PanelHeading({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return <div className="panel-heading"><div className="panel-heading-text">{icon ? <span className="icon-box">{icon}</span> : null}<div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div></div>{action}</div>;
}

export function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return <button className="icon-button" type="button" onClick={copy} title={label} aria-label={label}>{copied ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}</button>;
}

export function AddressChip({ address, copy = true }: { address: string; copy?: boolean }) {
  return <span className="address-chip"><code>{shortAddress(address)}</code>{copy ? <CopyButton value={address} label="Copiar dirección" /> : null}</span>;
}

export function actorDisplayLabel(address: string, actor?: Actor, fallbackName = 'Actor sin nombre'): string {
  const name = actor?.displayName?.trim() || fallbackName;
  const role = actor ? roleLabels[actor.role] : 'Cuenta ficticia';
  return `${name} · ${role} · ${shortAddress(address)}`;
}

export function ActorIdentity({ address, actor, fallbackName }: { address: string; actor?: Actor; fallbackName?: string }) {
  return <span className="actor-identity"><span>{actorDisplayLabel(address, actor, fallbackName)}</span><CopyButton value={address} label="Copiar dirección del actor" /></span>;
}

export function WhatHappened({ children }: { children: ReactNode }) {
  return <div className="what-happened"><div className="what-icon"><Info size={17} /></div><div><strong>¿Qué acaba de pasar?</strong><div>{children}</div></div></div>;
}

export function LayerLegend() {
  return <div className="layer-legend" aria-label="Capas de seguridad del prototipo">
    <div className="layer-legend-item layer-pqc"><span className="layer-icon"><KeyRound size={15} /></span><span><strong>Integridad del evento</strong><small>Firma ML-DSA post-cuántica</small></span></div>
    <div className="layer-legend-item layer-chain"><span className="layer-icon"><Network size={15} /></span><span><strong>Anclaje en red</strong><small>Hash y transacción Hardhat</small></span></div>
  </div>;
}

export function LayerCard({ type, title, description, children }: { type: 'pqc' | 'chain'; title: string; description: string; children: ReactNode }) {
  const Icon = type === 'pqc' ? KeyRound : Network;
  return <section className={`layer-card layer-card-${type}`}><div className="layer-card-heading"><span className="layer-icon"><Icon size={17} /></span><div><span className="layer-kicker">{type === 'pqc' ? 'POST-CUÁNTICA' : 'BLOCKCHAIN'}</span><h3>{title}</h3><p>{description}</p></div></div><div className="layer-card-content">{children}</div></section>;
}

export function EmptyState({ icon = <Info size={24} />, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function LoadingState({ label = 'Consultando la API…' }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function ErrorNotice({ message }: { message: string }) {
  return <div className="inline-alert error" role="alert"><CircleAlert size={18} /><span>{message}</span></div>;
}

export function SuccessNotice({ message }: { message: string }) {
  return <div className="inline-alert success" role="status"><BadgeCheck size={18} /><span>{message}</span></div>;
}

export function BooleanStatus({ value, label }: { value: boolean; label: string }) {
  return <span className={`boolean-status ${value ? 'is-valid' : 'is-invalid'}`}><span className="status-icon">{value ? <Check size={13} /> : <X size={13} />}</span>{label}: {value ? 'Sí' : 'No'}</span>;
}

export function VerificationChecks({ check }: { check: VerifyCheck }) {
  return <div className="check-grid"><BooleanStatus value={check.hashMatches} label="Hash del evento" /><BooleanStatus value={check.signatureValid} label="Firma ML-DSA" /><BooleanStatus value={check.publicKeyHashMatches} label="Clave pública" /><BooleanStatus value={check.chainHashMatches} label="Hash en cadena" /><BooleanStatus value={check.continuityValid} label="Continuidad" /></div>;
}

export function EventTimeline({ events }: { events: Event[] }) {
  const { actors } = useAppContext();
  return <div className="timeline">{events.map((event) => <div className="timeline-item" key={event.id}><div className="timeline-dot" /><div className="timeline-card"><div className="timeline-top"><span className="event-label">{eventLabels[event.type]}</span><span className="muted">{new Date(event.timestamp * 1000).toLocaleString('es-CO')}</span></div><div className="transfer-line">{event.fromAddress ? <ActorIdentity address={event.fromAddress} actor={actors.find((actor) => actor.address === event.fromAddress)} /> : <span className="muted">Inicio</span>}<ChevronRight size={16} /><ActorIdentity address={event.toAddress} actor={actors.find((actor) => actor.address === event.toAddress)} /></div><div className="hash-row"><span>Hash <code>{shortHash(event.eventHash)}</code></span><CopyButton value={event.eventHash} label="Copiar hash del evento" /></div></div></div>)}</div>;
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`role-badge role-${role}`}>{roleLabels[role]}</span>;
}

export function JsonBlock({ value, label = 'JSON' }: { value: unknown; label?: string }) {
  const text = JSON.stringify(value, null, 2);
  return <div className="json-block"><div className="json-heading"><span>{label}</span><CopyButton value={text} label={`Copiar ${label}`} /></div><pre>{text}</pre></div>;
}

export function useKnownLot(lotId: string): Lot | undefined {
  const { lots } = useAppContext();
  return useMemo(() => lots.find((lot) => lot.id === lotId), [lots, lotId]);
}

export function useGoToLot(): (lotId: string) => void {
  const navigate = useNavigate();
  return (lotId: string) => navigate(`/lots/${encodeURIComponent(lotId)}`);
}

export function useRoleForAddress(address: string): Role | undefined {
  const { actors } = useAppContext();
  return actors.find((actor) => actor.address === address)?.role;
}

export function NewEntryButton({ onClick }: { onClick: () => void }) {
  return <button className="button button-ghost button-small" type="button" onClick={onClick}><Plus size={15} />Añadir campo</button>;
}

export function WizardSteps({ steps, current }: { steps: string[]; current: number }) {
  return <div className="wizard-steps" aria-label="Progreso de la operación">{steps.map((step, index) => <div className={`wizard-step ${index === current ? 'current' : ''} ${index < current ? 'done' : ''}`} key={step}><span className="wizard-step-number">{index < current ? <Check size={13} /> : index + 1}</span><span>{step}</span></div>)}</div>;
}
