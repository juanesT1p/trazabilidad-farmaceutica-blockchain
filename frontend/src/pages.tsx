import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  Check,
  ChevronLeft,
  CircleAlert,
  Download,
  FileCheck2,
  FlaskConical,
  Hash,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Timer,
  Users,
} from 'lucide-react';
import { ApiError, api, apiErrorMessage, type ActorInput, type LotInput, type TransferInput } from './api';
import {
  ActorIdentity,
  actorDisplayLabel,
  BooleanStatus,
  CopyButton,
  EmptyState,
  ErrorNotice,
  EventTimeline,
  JsonBlock,
  LayerCard,
  LayerLegend,
  LoadingState,
  NewEntryButton,
  PageHeader,
  Panel,
  PanelHeading,
  RoleBadge,
  SuccessNotice,
  useAppContext,
  useKnownLot,
  WizardSteps,
  WhatHappened,
} from './components';
import { devAccounts, eventLabels, roleLabels, type Event, type KeyValueItem, type LotDetail, type MlDsaLevel, type VerifyCheck, type VerifyResponse } from './types';
import { metadataFromEntries, downloadFile, shortHash, verificationToCsv } from './utils';

const actorSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Usa una dirección EVM válida de 42 caracteres.'),
  displayName: z.string().trim().refine((value) => value === '' || value.length <= 80, 'El nombre debe tener entre 1 y 80 caracteres.').refine((value) => !/[\r\n]/.test(value), 'El nombre no puede contener saltos de línea.'),
  role: z.enum(['manufacturer', 'distributor', 'pharmacy', 'verifier']),
  level: z.enum(['44', '65', '87']),
});

const keyValueSchema = z.object({ key: z.string(), value: z.string() });
const lotSchema = z.object({ lotId: z.string().min(1, 'Escribe un identificador.').max(128, 'Máximo 128 caracteres.'), entries: z.array(keyValueSchema) });
const transferSchema = z.object({ lotId: z.string().min(1, 'Escribe o selecciona un lote.'), to: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Selecciona una dirección válida.'), entries: z.array(keyValueSchema) });

type ActorFormValues = z.infer<typeof actorSchema>;
type LotFormValues = z.infer<typeof lotSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

const suggestedEntries: KeyValueItem[] = [
  { key: 'producto', value: 'Medicamento de prueba' },
  { key: 'cantidad', value: '100' },
  { key: 'fechaVencimiento', value: '2027-12-31' },
];

export function DemoPage() {
  const { actors, lots, rememberActor, rememberLot, setActiveActorAddress, showToast } = useAppContext();
  const manufacturer = devAccounts[0];
  const distributor = devAccounts[1];
  const [step, setStep] = useState(0);
  const [lotId, setLotId] = useState(() => `LOTE-DEMO-${Date.now()}`);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<number, unknown>>({});

  const steps = [
    { title: 'Registrar actores', text: 'Fabricante y distribuidor ficticios', icon: <Users size={18} /> },
    { title: 'Crear lote', text: 'Un lote con metadatos de prueba', icon: <Plus size={18} /> },
    { title: 'Transferir custodia', text: 'Del fabricante al distribuidor', icon: <ArrowRightLeft size={18} /> },
    { title: 'Consultar historial', text: 'Cadena y eventos almacenados', icon: <Hash size={18} /> },
    { title: 'Verificar autenticidad', text: 'Hashes, firma y continuidad', icon: <ShieldCheck size={18} /> },
  ];

  const executeStep = async () => {
    setBusy(true);
    try {
      if (step === 0) {
        setActiveActorAddress(manufacturer.address);
        const registrations: unknown[] = [];
        for (const actor of [
          { address: manufacturer.address, role: 'manufacturer' as const },
          { address: distributor.address, role: 'distributor' as const },
        ]) {
          try {
            const response = await api.registerActor({ ...actor, displayName: actor.role === 'manufacturer' ? 'Fabricante demo' : 'Distribuidor demo', level: 65 });
            registrations.push(response);
            rememberActor(response.actor);
          } catch (error) {
            if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 409) {
              registrations.push({ address: actor.address, status: 'already_registered', message: 'El API indicó que el actor ya estaba registrado.' });
            } else throw error;
          }
        }
        setResults((current) => ({ ...current, 0: registrations }));
      }
      if (step === 1) {
        setActiveActorAddress(manufacturer.address);
        const response = await api.createLot({ lotId, metadata: { producto: 'Medicamento de demostración', cantidad: 100, fechaVencimiento: '2027-12-31' } }, manufacturer.address);
        rememberLot(response);
        setResults((current) => ({ ...current, 1: response }));
      }
      if (step === 2) {
        const response = await api.transferCustody(lotId, { to: distributor.address, metadata: { transporte: 'Ruta de demostración' } }, manufacturer.address);
        setResults((current) => ({ ...current, 2: response }));
        const previous = results[1] as LotDetail | undefined;
        if (previous) rememberLot({ ...previous, currentCustodian: distributor.address, events: [...previous.events, response] });
        setActiveActorAddress(distributor.address);
      }
      if (step === 3) {
        const [detail, history] = await Promise.all([api.getLot(lotId), api.getHistory(lotId)]);
        setResults((current) => ({ ...current, 3: { detail, history } }));
        rememberLot(detail);
      }
      if (step === 4) {
        const response = await api.verifyLot(lotId);
        setResults((current) => ({ ...current, 4: response }));
      }
      setStep((current) => Math.min(current + 1, steps.length - 1));
      if (step === steps.length - 1) showToast({ type: 'success', message: 'Recorrido completado: la verificación respondió correctamente.' });
    } catch (error) {
      showToast({ type: 'error', message: apiErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(0);
    setLotId(`LOTE-DEMO-${Date.now()}`);
    setResults({});
    setActiveActorAddress(manufacturer.address);
  };

  return <>
    <PageHeader eyebrow="Modo demostración" title="Del medicamento al historial verificable" description="Recorre el flujo real del API con actores y datos ficticios. Cada paso deja una evidencia distinta." action={<button className="button button-ghost" type="button" onClick={reset}><RotateCcw size={16} />Reiniciar</button>} />
    <div className="overview-grid" aria-label="Resumen operativo"><MetricCard icon={<Users size={18} />} label="Actores en esta sesión" value={String(actors.length)} helper="Identidades locales" /><MetricCard icon={<Boxes size={18} />} label="Lotes recordados" value={String(lots.length)} helper="Historial disponible" /><MetricCard icon={<Hash size={18} />} label="Eventos locales" value={String(lots.reduce((total, lot) => total + lot.events.length, 0))} helper="Firmados fuera de cadena" /><MetricCard icon={<ShieldCheck size={18} />} label="Arquitectura" value="ML-DSA + red" helper="Capas separadas" /></div>
    <Panel className="demo-hero">
      <div className="demo-intro"><div className="hero-icon"><ShieldCheck size={28} /></div><div><h2>Una cadena de custodia que se puede comprobar</h2><p>La blockchain fija huellas criptográficas; la base de datos conserva el evento completo y su firma post-cuántica. El botón ejecuta cada operación contra el backend local.</p></div></div>
      <LayerLegend />
      <div className="demo-summary" aria-label="Resumen del flujo">
        <div><span>Flujo</span><strong>Cadena de custodia</strong></div>
        <div><span>Lote</span><code>{lotId}</code></div>
        <div><span>Estado</span><strong>{results[step] ? 'Evidencia disponible' : 'Listo para ejecutar'}</strong></div>
      </div>
      <div className="demo-flow" aria-label="Progreso visual del recorrido">{steps.map((item, index) => <div className="flow-node-wrap" key={item.title}><button className={`flow-node ${index === step ? 'current' : ''} ${index < step ? 'done' : ''}`} type="button" onClick={() => index <= step && setStep(index)}><span className="flow-number">{index < step ? <Check size={15} /> : index + 1}</span><span className="flow-copy"><strong>{item.title}</strong><small>{item.text}</small></span></button>{index < steps.length - 1 ? <span className={`flow-connector ${index < step ? 'done' : ''}`} aria-hidden="true"><ArrowRight size={17} /></span> : null}</div>)}</div>
      <div className="demo-layout">
        <div className="demo-stage"><div className="stage-kicker">Paso {step + 1} de {steps.length}</div><div className="stage-title"><span className="icon-box">{steps[step]?.icon}</span><div><h2>{steps[step]?.title}</h2><p>{steps[step]?.text}</p></div></div>{step === 0 ? <div className="demo-facts"><div><span>Fabricante</span><ActorIdentity address={manufacturer.address} fallbackName="Fabricante demo" /></div><div><span>Distribuidor</span><ActorIdentity address={distributor.address} fallbackName="Distribuidor demo" /></div></div> : null}{step === 1 ? <div className="demo-facts"><div><span>Identificador del lote</span><code>{lotId}</code></div><div><span>Metadatos</span><code>producto · cantidad · fechaVencimiento</code></div></div> : null}{step >= 2 ? <div className="demo-facts"><div><span>Lote en demostración</span><code>{lotId}</code></div><div><span>Actor de escritura</span><ActorIdentity address={step === 2 ? manufacturer.address : distributor.address} fallbackName={step === 2 ? 'Fabricante demo' : 'Distribuidor demo'} /></div></div> : null}<div className="stage-actions"><button className="button button-primary" type="button" onClick={executeStep} disabled={busy}>{busy ? <><span className="spinner light" />Ejecutando…</> : step === steps.length - 1 ? <><ShieldCheck size={17} />Verificar ahora</> : <>Siguiente<ArrowRight size={17} /></>}</button>{step > 0 ? <button className="button button-ghost" type="button" onClick={() => setStep((current) => current - 1)} disabled={busy}><ChevronLeft size={17} />Anterior</button> : null}</div></div>
        <div className="demo-result">{results[step] ? <DemoResult step={step} result={results[step]} lotId={lotId} /> : <WhatHappened><p>Al avanzar, aquí aparecerá la evidencia que realmente devuelva el API. No se mostrarán datos calculados por el frontend.</p></WhatHappened>}</div>
      </div>
    </Panel>
  </>;
}

function DemoResult({ step, result, lotId }: { step: number; result: unknown; lotId: string }) {
  if (step === 4) {
    const verification = result as VerifyResponse;
    return <WhatHappened><p>La API recalculó los hashes, verificó la firma ML-DSA, comparó las huellas con la cadena y comprobó la continuidad. Resultado: <strong>{verification.valid ? 'válido' : 'alterado'}</strong>.</p><div className="demo-result-tags">{verification.checks.map((check) => <BooleanStatus key={check.eventHash} value={Object.values(check).slice(1).every(Boolean)} label={shortHash(check.eventHash, 6)} />)}</div><Link className="text-link" to={`/verify?lot=${encodeURIComponent(lotId)}`}>Abrir verificación detallada <ArrowRight size={15} /></Link></WhatHappened>;
  }
  if (step === 3) {
    const resultData = result as { detail: LotDetail; history: Event[] };
    return <WhatHappened><p>El API devolvió el lote con sus eventos y una lectura de cadena, además del historial almacenado fuera de la cadena.</p><div className="demo-result-tags"><span className="metric-chip">{resultData.history.length} eventos</span><span className="metric-chip">{resultData.detail.chain.eventHashes.length} hashes en cadena</span></div></WhatHappened>;
  }
  if (step === 0) {
    const registrations = result as Array<{ actor?: { address: string; publicKeyHash: string }; transaction?: { txHash: string }; status?: string }>;
    return <WhatHappened><p>Se registraron los actores en el contrato y en PostgreSQL. La respuesta incluye su rol, el nivel ML-DSA, el hash de la clave pública y la transacción.</p><div className="demo-result-tags">{registrations.map((item, index) => <span className="metric-chip" key={item.actor?.address ?? item.status ?? index}>{item.status === 'already_registered' ? 'Actor ya registrado' : 'Actor registrado'}</span>)}</div></WhatHappened>;
  }
  if (step === 1) {
    const lot = result as LotDetail;
    return <WhatHappened><p>Se creó el lote. La respuesta trae el `metadataHash`, el evento firmado, su `eventHash`, el `txHash` y el bloque.</p><div className="demo-result-tags"><span className="metric-chip">Hash: {shortHash(lot.events[0]?.eventHash ?? '', 6)}</span><span className="metric-chip">Bloque: {lot.events[0]?.blockNumber}</span></div></WhatHappened>;
  }
  const event = result as Event;
  return <WhatHappened><p>Se transfirió la custodia y el backend devolvió el nuevo evento con su hash, firma, transacción y bloque.</p><div className="demo-result-tags"><span className="metric-chip">{eventLabels[event.type]}</span><span className="metric-chip">Hash: {shortHash(event.eventHash, 6)}</span></div></WhatHappened>;
}

export function ActorsPage() {
  const { actors, activeActor, rememberActor, setActiveActorAddress, showToast } = useAppContext();
  const [error, setError] = useState('');
  const [existingActor, setExistingActor] = useState(false);
  const [step, setStep] = useState(0);
  const { register, handleSubmit, setValue, trigger, watch, formState: { errors, isSubmitting } } = useForm<ActorFormValues>({ resolver: zodResolver(actorSchema), defaultValues: { address: activeActor, displayName: '', role: 'manufacturer', level: '65' } });
  const formValues = watch();
  const onSubmit = async (values: ActorFormValues) => {
    setError('');
    try {
      const response = await api.registerActor({ ...values, displayName: values.displayName.trim() || undefined, level: Number(values.level) as MlDsaLevel } as ActorInput);
      rememberActor(response.actor);
      setActiveActorAddress(response.actor.address);
      showToast({ type: 'success', message: 'Actor registrado correctamente.' });
    } catch (submitError) {
      let errorToShow: unknown = submitError;
      if (submitError instanceof ApiError && submitError.status === 409 && submitError.message.startsWith('Actor "')) {
        try {
          const existing = await api.getActor(values.address);
          rememberActor(existing.actor);
          setActiveActorAddress(existing.actor.address);
          setExistingActor(true);
          setError('');
          showToast({ type: 'info', message: 'Este actor ya estaba registrado. Se cargó su identidad existente.' });
          return;
        } catch (loadError) {
          errorToShow = loadError;
        }
      }
      const message = apiErrorMessage(errorToShow);
      setError(message);
      showToast({ type: 'error', message });
    }
  };
  const nextStep = async () => {
    const valid = await trigger(step === 0 ? ['address', 'displayName'] : ['role', 'level']);
    if (valid) setStep((current) => Math.min(current + 1, 2));
  };
  return <>
    <PageHeader eyebrow="Identidad de demostración" title="Actores" description="Registra una identidad sin preocuparte por direcciones, claves privadas o formato criptográfico." />
    <div className="two-column-layout">
      <Panel><PanelHeading icon={<Users size={18} />} title="Registrar actor" description="La aplicación convierte tus decisiones en una identidad EVM y una clave ML-DSA." />
        <WizardSteps steps={['Identidad', 'Rol y protección', 'Confirmar']} current={step} />
        <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
          {step === 0 ? <><div className="field"><label htmlFor="actor-address">Dirección EVM</label><div className="input-with-action"><input id="actor-address" {...register('address')} placeholder="0x…" />{activeActor ? <button className="field-action" type="button" onClick={() => setValue('address', activeActor)} title="Usar actor activo">Usar sesión actual</button> : null}</div>{errors.address ? <span className="field-error">{errors.address.message}</span> : null}<span className="field-hint">La dirección se resuelve por ti al elegir una cuenta ficticia.</span></div><div className="field"><label htmlFor="actor-display-name">Nombre visible <span className="optional-label">(opcional)</span></label><input id="actor-display-name" {...register('displayName')} placeholder="Laboratorios ABC" maxLength={80} />{errors.displayName ? <span className="field-error">{errors.displayName.message}</span> : null}<span className="field-hint">Solo es una etiqueta para la interfaz; no es identidad legal.</span></div></> : null}
          {step === 1 ? <><div className="field"><label htmlFor="actor-role">¿Qué función tendrá?</label><select id="actor-role" {...register('role')}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>{errors.role ? <span className="field-error">{errors.role.message}</span> : null}</div><div className="field"><label htmlFor="actor-level">Nivel de protección post-cuántica</label><select id="actor-level" {...register('level')}><option value="44">ML-DSA-44</option><option value="65">ML-DSA-65 (recomendado)</option><option value="87">ML-DSA-87</option></select>{errors.level ? <span className="field-error">{errors.level.message}</span> : null}<span className="field-hint">La aplicación generará y guardará la clave automáticamente.</span></div><WhatHappened><p>Esta clave firmará los eventos de negocio de este actor. La transacción de red seguirá siendo una operación técnica gestionada por el backend.</p></WhatHappened></> : null}
          {step === 2 ? <div className="review-card"><span className="review-kicker">{existingActor ? 'Actor existente' : 'Listo para registrar'}</span><h3>{formValues.displayName || 'Actor de demostración'}</h3><p>{roleLabels[formValues.role]} · {formValues.address ? `${formValues.address.slice(0, 8)}…${formValues.address.slice(-6)}` : 'Cuenta pendiente'}</p><div className="review-tags"><span className="technical-badge"><KeyRound size={13} />ML-DSA-{formValues.level}</span><span className="verified-pill"><Check size={13} />{existingActor ? 'Identidad ya vinculada' : 'Clave gestionada por el backend'}</span></div></div> : null}
          {existingActor ? <SuccessNotice message="Este actor ya estaba registrado y puede utilizarse en las operaciones." /> : null}
          {error ? <ErrorNotice message={error} /> : null}
          <div className="wizard-actions">{step > 0 ? <button className="button button-ghost" type="button" onClick={() => { setExistingActor(false); setStep((current) => current - 1); }} disabled={isSubmitting}><ChevronLeft size={16} />Anterior</button> : null}{step < 2 ? <button className="button button-primary" type="button" onClick={nextStep}>Continuar<ArrowRight size={16} /></button> : existingActor ? <button className="button button-primary" type="button" onClick={() => showToast({ type: 'success', message: 'Puedes continuar usando este actor.' })}><Check size={17} />Usar actor existente</button> : <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? <><span className="spinner light" />Registrando…</> : <><ShieldCheck size={17} />Registrar actor</>}</button>}</div>
        </form>
      </Panel>
      <Panel><PanelHeading icon={<KeyRound size={18} />} title="Cuentas ficticias disponibles" description="Preselecciona una cuenta local de Hardhat. Nunca uses estas claves en una red real." />
        <div className="account-list">{devAccounts.map((account) => <div className="account-row" key={account.address}><div><strong>{actorDisplayLabel(account.address, actors.find((actor) => actor.address === account.address), account.label)}</strong></div><button className="button button-ghost button-small" type="button" onClick={() => { setValue('address', account.address); setActiveActorAddress(account.address); }}>Seleccionar</button></div>)}</div>
      </Panel>
    </div>
    <Panel className="mt-24"><PanelHeading icon={<Users size={18} />} title="Actores registrados en esta sesión" description="La vista principal muestra el estado; la huella técnica se consulta bajo demanda." />{actors.length === 0 ? <EmptyState icon={<Users size={24} />} title="Aún no hay actores locales" description="Registra el primer actor o usa el recorrido guiado." /> : <div className="table-wrap"><table><thead><tr><th>Identidad descriptiva</th><th>Rol</th><th>Protección</th><th>Estado</th></tr></thead><tbody>{actors.map((actor) => <tr key={actor.address}><td><ActorIdentity address={actor.address} actor={actor} /></td><td><RoleBadge role={actor.role} /></td><td><div className="protection-cell"><span className="technical-badge"><KeyRound size={13} />ML-DSA-{actor.level}</span><details className="inline-disclosure"><summary>Ver hash</summary><span><code>{shortHash(actor.publicKeyHash, 8)}</code><CopyButton value={actor.publicKeyHash} label="Copiar hash de clave pública" /></span></details></div></td><td><span className="verified-pill"><Check size={13} />Vinculada</span></td></tr>)}</tbody></table></div>}</Panel>
  </>;
}

export function CreateLotPage() {
  const { activeActor, rememberLot, showToast } = useAppContext();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const { register, control, watch, trigger, handleSubmit, formState: { errors, isSubmitting } } = useForm<LotFormValues>({ resolver: zodResolver(lotSchema), defaultValues: { lotId: `LOTE-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`, entries: suggestedEntries } });
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });
  const entries = watch('entries');
  const preview = metadataFromEntries(entries ?? []);
  const onSubmit = async (values: LotFormValues) => {
    setError('');
    try {
      const input: LotInput = { lotId: values.lotId, metadata: metadataFromEntries(values.entries) };
      const response = await api.createLot(input, activeActor);
      rememberLot(response);
      showToast({ type: 'success', message: `Lote ${response.id} creado.` });
      navigate(`/lots/${encodeURIComponent(response.id)}`);
    } catch (submitError) { const message = apiErrorMessage(submitError); setError(message); showToast({ type: 'error', message }); }
  };
  const nextStep = async () => {
    if (await trigger('lotId')) setStep(1);
  };
  return <>
    <PageHeader eyebrow="Trazabilidad" title="Crear lote" description="Registra un lote en dos pasos. La aplicación se encargará de firmar el evento y anclar su huella." />
    <div className="two-column-layout">
      <Panel><PanelHeading icon={<Plus size={18} />} title="Nuevo lote" description="La información técnica aparecerá después de confirmar." /><WizardSteps steps={['Identificador', 'Datos del producto']} current={step} /><form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
        {step === 0 ? <><div className="field"><label htmlFor="lot-id">Identificador del lote</label><input id="lot-id" {...register('lotId')} placeholder="LOTE-2026-001" />{errors.lotId ? <span className="field-error">{errors.lotId.message}</span> : null}<span className="field-hint">Usa un código único que puedas reconocer después.</span></div><WhatHappened><p>Primero identificaremos el lote. En el siguiente paso añadirás los datos del medicamento.</p></WhatHappened></> : <><div className="field-group-heading"><div><label>Datos del producto</label><span className="field-hint">Estos campos forman parte del evento firmado.</span></div><NewEntryButton onClick={() => append({ key: '', value: '' })} /></div><div className="metadata-editor">{fields.map((field, index) => <div className="metadata-row" key={field.id}><input aria-label={`Nombre del metadato ${index + 1}`} {...register(`entries.${index}.key`)} placeholder="campo" /><input aria-label={`Valor del metadato ${index + 1}`} {...register(`entries.${index}.value`)} placeholder="valor" /><button className="icon-button danger" type="button" onClick={() => remove(index)} aria-label="Eliminar campo">×</button></div>)}</div><LayerLegend /></>}
        {error ? <ErrorNotice message={error} /> : null}<div className="wizard-actions">{step > 0 ? <button className="button button-ghost" type="button" onClick={() => setStep(0)} disabled={isSubmitting}><ChevronLeft size={16} />Anterior</button> : null}{step === 0 ? <button className="button button-primary" type="button" onClick={nextStep}>Continuar<ArrowRight size={16} /></button> : <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? <><span className="spinner light" />Creando…</> : <><Plus size={17} />Crear lote</>}</button>}</div>
      </form></Panel>
      <Panel><PanelHeading icon={<FlaskConical size={18} />} title="Qué ocurrirá" description="Una explicación simple de la protección aplicada." /><div className="process-card"><div className="process-row"><span className="process-number">1</span><span><strong>Evento de negocio</strong><small>Guardaremos producto, cantidad y vencimiento.</small></span></div><div className="process-row"><span className="process-number">2</span><span><strong>Firma post-cuántica</strong><small>El backend firmará el evento con ML-DSA.</small></span></div><div className="process-row"><span className="process-number">3</span><span><strong>Huella en blockchain</strong><small>Hardhat conservará el hash y la transacción.</small></span></div></div><JsonBlock value={preview} label="Vista previa de metadatos" /></Panel>
    </div>
  </>;
}

export function TransferPage() {
  const { activeActor, actors, lots, showToast, rememberLot } = useAppContext();
  const [error, setError] = useState('');
  const [checkedLot, setCheckedLot] = useState<LotDetail | null>(null);
  const [step, setStep] = useState(0);
  const transferQueryLot = new URLSearchParams(window.location.search).get('lot') ?? '';
  const { register, control, watch, trigger, handleSubmit, formState: { errors, isSubmitting } } = useForm<TransferFormValues>({ resolver: zodResolver(transferSchema), defaultValues: { lotId: transferQueryLot || lots.at(-1)?.id || '', to: actors.find((actor) => actor.address !== activeActor)?.address ?? devAccounts[1]?.address ?? '', entries: [{ key: 'observacion', value: 'Entrega de demostración' }] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });
  const lotId = watch('lotId');
  const knownLot = useKnownLot(lotId);
  const query = useQuery({ queryKey: ['lot', lotId], queryFn: () => api.getLot(lotId), enabled: false, retry: false });
  const currentLot = checkedLot ?? query.data ?? knownLot as LotDetail | undefined;
  const submit = async (values: TransferFormValues) => {
    setError('');
    try {
      const event = await api.transferCustody(values.lotId, { to: values.to, metadata: metadataFromEntries(values.entries) } as TransferInput, activeActor);
      const updated = currentLot ? { ...currentLot, currentCustodian: values.to, events: [...currentLot.events, event] } : undefined;
      if (updated) rememberLot(updated);
      showToast({ type: 'success', message: 'La custodia fue transferida.' });
      setCheckedLot(updated ?? null);
    } catch (submitError) { const message = apiErrorMessage(submitError); setError(message); showToast({ type: 'error', message }); }
  };
  const loadLot = async () => { if (!lotId) return; setCheckedLot(null); await query.refetch(); };
  const currentCustodian = currentLot?.currentCustodian;
  const nextStep = async () => {
    if (step === 0) {
      if (!currentLot) return;
      setStep(1);
      return;
    }
    if (await trigger('to')) setStep(2);
  };
  return <>
    <PageHeader eyebrow="Cadena de custodia" title="Transferir custodia" description="Elige el lote, confirma quién lo recibirá y deja que la aplicación firme y registre la entrega." />
    <Panel><PanelHeading icon={<ArrowRightLeft size={18} />} title="Nueva transferencia" description="El destinatario debe estar registrado y no puede ser un verificador." /><WizardSteps steps={['Elegir lote', 'Destinatario', 'Confirmar entrega']} current={step} /><LayerLegend /><form className="form-stack" onSubmit={handleSubmit(submit)}>
      {step === 0 ? <><div className="field"><label htmlFor="transfer-lot">¿Qué lote quieres transferir?</label><div className="input-with-action"><input id="transfer-lot" {...register('lotId')} placeholder="LOTE-…" list="known-lots" />{lots.length > 0 ? <datalist id="known-lots">{lots.map((lot) => <option value={lot.id} key={lot.id} />)}</datalist> : null}<button className="field-action" type="button" onClick={loadLot} disabled={query.isFetching}>{query.isFetching ? 'Consultando…' : 'Consultar lote'}</button></div>{errors.lotId ? <span className="field-error">{errors.lotId.message}</span> : null}<span className="field-hint">Consultaremos el custodio actual antes de continuar.</span></div>{currentLot ? <div className="inline-alert success"><Check size={18} /><span>Lote encontrado. Custodio actual: <ActorIdentity address={currentCustodian ?? ''} actor={actors.find((actor) => actor.address === currentCustodian)} /></span></div> : <WhatHappened><p>Elige un lote creado previamente y pulsa “Consultar lote”.</p></WhatHappened>}</> : null}
      {step === 1 ? <><div className="field"><label htmlFor="transfer-to">¿Quién recibirá el lote?</label><select id="transfer-to" {...register('to')}>{devAccounts.filter((account) => account.address !== activeActor).map((account) => { const local = actors.find((actor) => actor.address === account.address); return <option value={account.address} key={account.address}>{local?.displayName || account.label} · {local ? roleLabels[local.role] : 'Cuenta demo'}</option>; })}</select>{errors.to ? <span className="field-error">{errors.to.message}</span> : null}</div>{currentCustodian && currentCustodian !== activeActor ? <div className="inline-alert warning"><CircleAlert size={18} /><span>El actor activo no es el custodio actual. Cambia la sesión del header a <ActorIdentity address={currentCustodian} actor={actors.find((actor) => actor.address === currentCustodian)} />.</span></div> : null}{currentCustodian === activeActor ? <div className="inline-alert success"><Check size={18} /><span>La sesión actual sí puede transferir este lote.</span></div> : null}<WhatHappened><p>La custodia cambiará únicamente después de que el backend valide al actor actual y confirme la transacción.</p></WhatHappened></> : null}
      {step === 2 ? <><div className="review-card"><span className="review-kicker">Resumen de entrega</span><h3>{lotId}</h3><p><ActorIdentity address={activeActor} actor={actors.find((actor) => actor.address === activeActor)} /> <ArrowRight size={15} /> <ActorIdentity address={watch('to')} actor={actors.find((actor) => actor.address === watch('to'))} /></p><div className="review-tags"><span className="technical-badge"><KeyRound size={13} />Evento firmado con ML-DSA</span><span className="verified-pill"><Check size={13} />Hash anclado en Hardhat</span></div></div><div className="field-group-heading"><div><label>Información de la entrega</label><span className="field-hint">Se guardará dentro del evento firmado.</span></div><NewEntryButton onClick={() => append({ key: '', value: '' })} /></div><div className="metadata-editor">{fields.map((field, index) => <div className="metadata-row" key={field.id}><input aria-label={`Nombre del metadato de transferencia ${index + 1}`} {...register(`entries.${index}.key`)} placeholder="campo" /><input aria-label={`Valor del metadato de transferencia ${index + 1}`} {...register(`entries.${index}.value`)} placeholder="valor" /><button className="icon-button danger" type="button" onClick={() => remove(index)} aria-label="Eliminar campo">×</button></div>)}</div></> : null}
      {error ? <ErrorNotice message={error} /> : null}<div className="wizard-actions">{step > 0 ? <button className="button button-ghost" type="button" onClick={() => setStep((current) => current - 1)} disabled={isSubmitting}><ChevronLeft size={16} />Anterior</button> : null}{step < 2 ? <button className="button button-primary" type="button" onClick={nextStep} disabled={step === 0 && !currentLot}>Continuar<ArrowRight size={16} /></button> : <button className="button button-primary" type="submit" disabled={isSubmitting || !activeActor}>{isSubmitting ? <><span className="spinner light" />Transfiriendo…</> : <><ArrowRightLeft size={17} />Confirmar transferencia</>}</button>}</div>
    </form></Panel>
  </>;
}

export function LotDetailPage() {
  const { lotId = '' } = useParams();
  const { actors } = useAppContext();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['lot', lotId], queryFn: () => api.getLot(lotId), enabled: Boolean(lotId), retry: false });
  return <>
    <PageHeader eyebrow="Evidencia del lote" title={lotId} description="El negocio primero; la evidencia técnica está separada por capa y se puede inspeccionar cuando haga falta." action={<button className="button button-ghost button-small" type="button" onClick={() => refetch()}><RefreshCw size={15} />Actualizar</button>} />
    {isLoading ? <LoadingState /> : error ? <ErrorNotice message={apiErrorMessage(error)} /> : data ? <>
      <div className="detail-summary"><div><span className="summary-label">Custodio actual</span><ActorIdentity address={data.currentCustodian} actor={actors.find((actor) => actor.address === data.currentCustodian)} /></div><div><span className="summary-label">Eventos</span><strong>{data.events.length}</strong></div><div><span className="summary-label">Estado en cadena</span><span className="verified-pill"><Check size={14} />{data.chain.exists ? 'Hash anclado' : 'No encontrado'}</span></div></div>
      <LayerLegend />
      <div className="detail-grid">
        <Panel><PanelHeading icon={<ArrowRightLeft size={18} />} title="Historial de custodia" description="Eventos ordenados desde la creación del lote." />{data.events.length ? <EventTimeline events={data.events} /> : <EmptyState title="Sin eventos" description="Este lote no tiene eventos en la respuesta." />}</Panel>
        <Panel className="evidence-panel">
          <PanelHeading icon={<FileCheck2 size={18} />} title="Evidencia técnica" description="Abre cada capa solo cuando necesites auditarla." />
          <LayerCard type="chain" title="Hash anclado en la red" description="La blockchain local conserva huellas y custodio, no la firma ML-DSA completa.">
            <div className="fact-list"><Fact label="Existe" value={String(data.chain.exists)} /><Fact label="Custodio on-chain" value={data.chain.custodian} copy /><Fact label="Hash de metadatos" value={data.chain.metadataHash} copy /><Fact label="Eventos anclados" value={`${data.chain.eventHashes.length} hash(s)`} /></div>
          </LayerCard>
          <details className="technical-disclosure"><summary>Ver eventos completos y firmas</summary><div className="technical-disclosure-body"><JsonBlock value={data.events.map((event) => ({ type: event.type, metadata: event.metadata, eventHash: event.eventHash, signature: event.signature, level: event.level, txHash: event.txHash, blockNumber: event.blockNumber }))} label="eventos fuera de cadena" /></div></details>
        </Panel>
      </div>
      <div className="detail-actions"><Link className="button button-primary" to={`/verify?lot=${encodeURIComponent(data.id)}`}><ShieldCheck size={17} />Verificar autenticidad</Link><Link className="button button-ghost" to={`/transfer?lot=${encodeURIComponent(data.id)}`}><ArrowRightLeft size={17} />Transferir custodia</Link></div>
    </> : null}
  </>;
}

function Fact({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) { return <div className="fact-row"><span>{label}</span><div><code>{copy ? shortHash(value) : value}</code>{copy ? <span className="fact-copy"><button className="icon-button" type="button" onClick={() => navigator.clipboard.writeText(value)} aria-label={`Copiar ${label}`}><Hash size={15} /></button></span> : null}</div></div>; }

export function VerifyPage() {
  const { lots, showToast } = useAppContext();
  const queryParams = new URLSearchParams(window.location.search);
  const [lotId, setLotId] = useState(queryParams.get('lot') ?? lots.at(-1)?.id ?? '');
  const [verification, setVerification] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: api.verifyLot });
  const verify = async () => { setError(''); setVerification(null); try { const response = await mutation.mutateAsync(lotId); setVerification(response); showToast({ type: response.valid ? 'success' : 'error', message: response.valid ? 'El lote pasó todas las comprobaciones.' : 'La API detectó una inconsistencia.' }); } catch (verifyError) { const message = apiErrorMessage(verifyError); setError(message); showToast({ type: 'error', message }); } };
  const exportJson = () => { if (verification) downloadFile(`verificacion-${lotId}.json`, JSON.stringify(verification, null, 2), 'application/json'); };
  const exportCsv = () => { if (verification) downloadFile(`verificacion-${lotId}.csv`, verificationToCsv(verification), 'text/csv'); };
  return <>
    <PageHeader eyebrow="Integridad criptográfica" title="Verificación" description="Comprueba primero si el lote es confiable. Los hashes, firmas y transacciones quedan disponibles como evidencia avanzada." />
    <Panel>
      <div className="verify-search"><div className="field"><label htmlFor="verify-lot">Identificador del lote</label><input id="verify-lot" value={lotId} onChange={(event) => setLotId(event.target.value)} placeholder="LOTE-…" list="verify-lots" /><datalist id="verify-lots">{lots.map((lot) => <option value={lot.id} key={lot.id} />)}</datalist></div><button className="button button-primary" type="button" onClick={verify} disabled={!lotId || mutation.isPending}>{mutation.isPending ? <><span className="spinner light" />Verificando…</> : <><ShieldCheck size={17} />Verificar autenticidad</>}</button></div>
      <LayerLegend />
      {error ? <ErrorNotice message={error} /> : null}
      {verification ? <div className={`verification-result ${verification.valid ? 'valid' : 'invalid'}`}>
        <div className="verification-heading"><div className="verification-icon">{verification.valid ? <Check size={28} /> : <CircleAlert size={28} />}</div><div><span className="eyebrow">Resultado del API</span><h2>{verification.valid ? 'Lote verificado' : 'Se detectó una alteración o inconsistencia'}</h2><p>{verification.valid ? 'Los eventos coinciden con sus hashes, firmas y continuidad registrada.' : 'Abre el evento marcado para identificar qué comprobación falló.'}</p></div></div>
        <div className="verification-layer-grid"><LayerCard type="pqc" title="Evento protegido" description="La evidencia local conserva integridad y autoría mediante ML-DSA."><div className="layer-status-summary"><strong>{verification.checks.filter((check) => check.hashMatches && check.signatureValid && check.publicKeyHashMatches && check.continuityValid).length}/{verification.checks.length}</strong><span>eventos íntegros</span></div></LayerCard><LayerCard type="chain" title="Anclaje en blockchain" description="El hash de cada evento aparece en la red local Hardhat."><div className="layer-status-summary"><strong>{verification.checks.filter((check) => check.chainHashMatches).length}/{verification.checks.length}</strong><span>hashes encontrados</span></div></LayerCard></div>
        <div className="inline-alert info verification-note"><InfoIcon />La firma ML-DSA protege el evento de negocio. La transacción de esta demo sigue usando ECDSA/secp256k1 en Hardhat.</div>
        <div className="verification-actions"><button className="button button-ghost button-small" type="button" onClick={exportJson}><Download size={15} />Exportar JSON</button><button className="button button-ghost button-small" type="button" onClick={exportCsv}><Download size={15} />Exportar CSV</button></div>
        <div className="verification-event-list"><div className="section-label">Detalle por evento</div>{verification.checks.map((check, index) => <VerificationEventRow key={check.eventHash} check={check} index={index} />)}</div>
      </div> : <EmptyState icon={<FileCheck2 size={24} />} title="Aún no hay una verificación" description="Escribe un lote creado por el API y ejecuta la comprobación completa." />}
    </Panel>
  </>;
}

function InfoIcon() {
  return <span className="inline-alert-icon" aria-hidden="true">i</span>;
}

function VerificationEventRow({ check, index }: { check: VerifyCheck; index: number }) {
  const pqcValid = check.hashMatches && check.signatureValid && check.publicKeyHashMatches && check.continuityValid;
  return <details className="verification-event" open={!pqcValid || !check.chainHashMatches}>
    <summary className="verification-event-heading"><span><strong>Evento {index + 1}</strong><small>{pqcValid && check.chainHashMatches ? 'Todas las comprobaciones pasaron' : 'Requiere revisión'}</small></span><span className="verification-event-meta"><span className={`status-dot ${pqcValid && check.chainHashMatches ? 'is-ok' : 'is-error'}`} /> <code>{shortHash(check.eventHash, 10)}</code></span></summary>
    <div className="verification-layer-grid verification-layer-grid-detail"><LayerCard type="pqc" title="Integridad del evento" description="Comprobaciones realizadas fuera de la cadena."><div className="check-stack"><BooleanStatus value={check.hashMatches} label="Hash del evento" /><BooleanStatus value={check.signatureValid} label="Firma ML-DSA" /><BooleanStatus value={check.publicKeyHashMatches} label="Clave pública vinculada" /><BooleanStatus value={check.continuityValid} label="Continuidad del historial" /></div></LayerCard><LayerCard type="chain" title="Anclaje en red" description="Comprobaciones contra el contrato local."><div className="check-stack"><BooleanStatus value={check.chainHashMatches} label="Hash encontrado en la cadena" /></div></LayerCard></div>
  </details>;
}

interface GasMeasurement { count: number; mean: number; median: number; stdDev: number; values?: number[] }
interface CryptoResult { algorithm: string; repetitions: number; publicKeyBytes: number; secretKeyBytes: number; signatureBytes: number; keygen: Metric; sign: Metric; verify: Metric }
interface Metric { count: number; meanMs: number; medianMs: number; p95Ms: number; stdDevMs: number }

export function MeasurementsPage() {
  const [gas, setGas] = useState<Record<string, GasMeasurement> | null>(null);
  const [crypto, setCrypto] = useState<CryptoResult[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  useEffect(() => { let cancelled = false; const load = async () => { const missingFiles: string[] = []; const read = async (path: string) => { const response = await fetch(path); if (!response.ok) { missingFiles.push(path); return null; } return response.json() as Promise<unknown>; }; const [gasData, cryptoData] = await Promise.all([read('/reports/gas-measurements.json'), read('/reports/crypto-measurements.json')]); if (cancelled) return; if (gasData && typeof gasData === 'object' && 'summary' in gasData) setGas((gasData as { summary: Record<string, GasMeasurement> }).summary); if (cryptoData && typeof cryptoData === 'object' && 'results' in cryptoData) setCrypto((cryptoData as { results: CryptoResult[] }).results); setMissing(missingFiles); }; void load(); return () => { cancelled = true; }; }, []);
  return <><PageHeader eyebrow="Evidencia reproducible" title="Mediciones" description="Resultados leídos de los JSON generados por los scripts del repositorio. No se agregan cifras de ejemplo." /><div className="metric-cards"><MetricCard icon={<Timer size={18} />} label="Fuentes disponibles" value={missing.length === 0 ? 'Completas' : 'Parciales'} helper={missing.length === 0 ? 'Gas y criptografía' : `${missing.length} archivo(s) no encontrado(s)`} /><MetricCard icon={<BarChart3 size={18} />} label="Gas medido" value={gas ? `${Object.keys(gas).length} operaciones` : 'NO EJECUTADO'} helper="30 repeticiones por operación" /><MetricCard icon={<FlaskConical size={18} />} label="Criptografía" value={crypto ? `${crypto.length} algoritmos` : 'NO EJECUTADO'} helper="500 mediciones + calentamiento" /></div>{missing.length ? <div className="inline-alert warning"><CircleAlert size={18} /><span>NO EJECUTADO para: {missing.join(', ')}</span></div> : null}<Panel className="mt-24"><PanelHeading icon={<BarChart3 size={18} />} title="Consumo de gas" description="Valores reportados por `gas-measurements.json`." />{gas ? <div className="table-wrap"><table><thead><tr><th>Operación</th><th>Repeticiones</th><th>Media</th><th>Mediana</th><th>Desv. estándar</th></tr></thead><tbody>{Object.entries(gas).map(([operation, value]) => <tr key={operation}><td><code>{operation}</code></td><td>{value.count}</td><td>{value.mean.toFixed(2)}</td><td>{value.median}</td><td>{value.stdDev.toFixed(3)}</td></tr>)}</tbody></table></div> : <EmptyState title="NO EJECUTADO" description="No se encontró el resultado de gas en los archivos publicados." />}</Panel>{gas ? <Panel className="mt-24"><PanelHeading icon={<BarChart3 size={18} />} title="Comparación visual" description="Media de gas por operación; la escala usa solo los valores leídos." /><SimpleBarChart entries={Object.entries(gas).map(([label, value]) => ({ label, value: value.mean }))} suffix=" gas" /></Panel> : null}<Panel className="mt-24"><PanelHeading icon={<FlaskConical size={18} />} title="Operaciones criptográficas" description="Media, mediana y p95 en milisegundos." />{crypto ? <div className="table-wrap"><table><thead><tr><th>Algoritmo</th><th>Operación</th><th>Bytes</th><th>Media ms</th><th>Mediana ms</th><th>p95 ms</th></tr></thead><tbody>{crypto.flatMap((result) => [['keygen', result.keygen], ['sign', result.sign], ['verify', result.verify] ] as const).map(([operation, metric], index) => { const result = crypto[Math.floor(index / 3)]; return <tr key={`${result.algorithm}-${operation}`}><td>{result.algorithm}</td><td><code>{operation}</code></td><td>{operation === 'keygen' ? result.publicKeyBytes : operation === 'sign' ? result.signatureBytes : result.publicKeyBytes}</td><td>{metric.meanMs.toFixed(3)}</td><td>{metric.medianMs.toFixed(3)}</td><td>{metric.p95Ms.toFixed(3)}</td></tr>; })}</tbody></table></div> : <EmptyState title="NO EJECUTADO" description="No se encontró el resultado criptográfico en los archivos publicados." />}</Panel>{crypto ? <Panel className="mt-24"><PanelHeading icon={<FlaskConical size={18} />} title="Firma ML-DSA: media" description="Comparación simple basada en los valores medidos del JSON." /><SimpleBarChart entries={crypto.map((result) => ({ label: result.algorithm, value: result.sign.meanMs }))} suffix=" ms" /></Panel> : null}</>;
}

function MetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) { return <div className="metric-card"><span className="icon-box">{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong><small>{helper}</small></div>; }

function SimpleBarChart({ entries, suffix }: { entries: Array<{ label: string; value: number }>; suffix: string }) {
  const max = Math.max(...entries.map((entry) => entry.value), 1);
  return <div className="simple-chart">{entries.map((entry) => <div className="chart-row" key={entry.label}><span>{entry.label}</span><div className="chart-track"><div className="chart-bar" style={{ width: `${(entry.value / max) * 100}%` }} /></div><code>{entry.value.toFixed(2)}{suffix}</code></div>)}</div>;
}

export function LimitationsPage() {
  const [content, setContent] = useState('Cargando limitaciones…');
  useEffect(() => { void fetch('/docs/limitations.md').then(async (response) => response.ok ? response.text() : Promise.reject(new Error('No se encontró docs/limitations.md'))).then(setContent).catch((error: unknown) => setContent(`No fue posible cargar las limitaciones: ${apiErrorMessage(error)}`)); }, []);
  return <><PageHeader eyebrow="Transparencia del prototipo" title="Limitaciones conocidas" description="El sistema demuestra una idea verificable; no es una plataforma de producción." /><Panel><div className="markdown-content">{content.split('\n').map((line, index) => <p key={`${line}-${index}`} className={line.startsWith('#') ? 'markdown-heading' : line.startsWith('-') || /^\d+\./.test(line) ? 'markdown-list-item' : ''}>{line.replace(/^#+\s*/, '').replace(/^[-]\s*/, '• ')}</p>)}</div></Panel></>;
}

export function SettingsPage() {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['settings'], queryFn: api.getSettings, retry: false });
  const mutation = useMutation({ mutationFn: api.updateContractAddress });

  useEffect(() => {
    if (query.data) setAddress(query.data.contractAddress);
  }, [query.data]);

  const save = async () => {
    setError('');
    try {
      const updated = await mutation.mutateAsync(address.trim());
      setAddress(updated.contractAddress);
      await query.refetch();
    } catch (saveError) {
      setError(apiErrorMessage(saveError));
    }
  };

  return <>
    <PageHeader eyebrow="Operación local" title="Ajustes del entorno" description="Actualiza la dirección del contrato Hardhat desde el navegador cuando la red local se reinicia." />
    <Panel>
      <PanelHeading icon={<Settings2 size={18} />} title="Conexión blockchain" description="Este ajuste se aplica en la memoria del backend y no modifica archivos del proyecto." />
      {query.isLoading ? <LoadingState label="Consultando configuración del backend…" /> : <div className="settings-layout">
        <div className="form-stack">
          <div className="field"><label htmlFor="contract-address">Dirección del contrato</label><input id="contract-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x…" spellCheck={false} /><span className="field-hint">Pega la dirección que devuelve `scripts/deploy-local.ts`.</span></div>
          {error ? <ErrorNotice message={error} /> : null}
          <button className="button button-primary" type="button" onClick={save} disabled={mutation.isPending || !address.trim()}>{mutation.isPending ? <><span className="spinner light" />Aplicando…</> : <><Save size={17} />Aplicar dirección</>}</button>
        </div>
        <div className="settings-status"><div className="settings-status-heading"><span className="icon-box"><Settings2 size={18} /></span><div><strong>Estado del entorno</strong><p>{query.data?.environment === 'production' ? 'Producción' : 'Desarrollo local'}</p></div></div><div className="fact-list"><Fact label="RPC" value={query.data?.rpcUrl ?? 'No disponible'} /><Fact label="Modo" value={query.data?.runtimeOverride ? 'Dirección aplicada en memoria' : 'Dirección del .env'} /></div></div>
      </div>}
      <WhatHappened><p>Después de reiniciar Hardhat debes desplegar el contrato otra vez y aplicar aquí la nueva dirección. Las claves y los datos del backend no se muestran en el navegador.</p></WhatHappened>
    </Panel>
  </>;
}
