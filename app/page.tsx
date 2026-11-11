"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteSecret, hasSecret, readSecret, saveSecret } from "@/lib/vault";
import { marked } from "marked";
import DOMPurify from "dompurify";

type Provider = "openai" | "anthropic" | "gemini";
type SavedProject = { id: string; idea: string; kind: string; audience: string; problem: string; tone: string; stage: string; output: string; updatedAt: number };
const providers: { id: Provider; name: string; model: string; hint: string }[] = [
  { id: "openai", name: "OpenAI", model: "gpt-5.5", hint: "gpt-5.5" },
  { id: "anthropic", name: "Anthropic", model: "claude-sonnet-5-5", hint: "claude-sonnet-5-5" },
  { id: "gemini", name: "Google Gemini", model: "gemini-3.8-flash", hint: "gemini-3.8-flash" }
];
const kinds = ["eBook", "Notion template", "PDF guide", "Online course", "AI tool", "Automation", "Prompt collection", "Other"];
const tones = ["Warm and direct", "Calm expert", "Playful", "Premium and editorial", "Minimal and practical", "Bold and persuasive"];

export default function Home() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState(providers[0].model);
  const [passphrase, setPassphrase] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState(false);
  const [idea, setIdea] = useState("");
  const [kind, setKind] = useState("eBook");
  const [audience, setAudience] = useState("");
  const [problem, setProblem] = useState("");
  const [tone, setTone] = useState(tones[0]);
  const [stage, setStage] = useState("brief");
  const [output, setOutput] = useState("");
  const [renderedPreview, setRenderedPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Your studio is ready.");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  useEffect(() => {
    try { setSavedProjects(JSON.parse(localStorage.getItem("luonix-projects") || "[]")); } catch { setSavedProjects([]); }
    Promise.all(providers.map(async p => [p.id, await hasSecret(p.id)] as const))
      .then(entries => setKeys(Object.fromEntries(entries)))
      .catch(() => setStatus("Local vault unavailable in this browser."));
  }, []);

  useEffect(() => {
    if (!output) { setRenderedPreview(""); return; }
    setRenderedPreview(DOMPurify.sanitize(marked.parse(output, { async: false }) as string));
  }, [output]);

  const selected = useMemo(() => providers.find(p => p.id === provider)!, [provider]);
  function changeProvider(id: Provider) {
    setProvider(id);
    setModel(providers.find(p => p.id === id)!.model);
  }
  async function saveKey() {
    setError("");
    try {
      await saveSecret(provider, keyInput.trim(), passphrase);
      setKeys(old => ({ ...old, [provider]: true }));
      setKeyInput("");
      setStatus(selected.name + " key encrypted and saved on this device.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save key."); }
  }
  async function removeKey() {
    await deleteSecret(provider);
    setKeys(old => ({ ...old, [provider]: false }));
    setStatus(selected.name + " key removed from this device.");
  }
  async function generate(task: "brief" | "outline" | "product" | "sales") {
    setBusy(true); setError(""); setStatus("Luonix is working...");
    try {
      const apiKey = await readSecret(provider, passphrase);
      const base = `PRODUCT IDEA: ${idea}\nPRODUCT FORMAT: ${kind}\nTARGET AUDIENCE: ${audience || "Identify the best-fit audience"}\nPROBLEM TO SOLVE: ${problem || "Identify a specific painful problem"}\nVOICE: ${tone}\n\nCreate original, practical work. Be specific, avoid generic filler, distinguish assumptions from verified facts, and do not invent research or citations.`;
      const instructions: Record<string, string> = {
        brief: "Create a rigorous product opportunity brief: audience segments, urgent problem, desired transformation, unique angle, competitive differentiation hypotheses, product promise, scope, risks, and a realistic validation plan. End with a clear recommended positioning.",
        outline: "Create a complete production-ready product outline. For an ebook include a compelling title, subtitle, promise, table of contents, chapter objectives, key exercises, examples, and bonus resources. For other formats adapt the structure to the format. Make it coherent and detailed enough to build from.",
        product: "Create the complete, polished, ready-to-edit digital product, not just an outline. Include title page, introduction, all sections/modules/chapters with substantial useful content, examples, actionable steps, worksheets or templates where appropriate, conclusion, and bonus resources. Avoid padding. For a software/automation product include architecture, setup, workflows, prompts, and implementation details.",
        sales: "Write a complete conversion-focused product sales page: headline, subheadline, problem, transformation, what's included, feature-to-benefit mapping, who it is and isn't for, FAQs, ethical urgency if justified, and CTA. Do not invent testimonials, guarantees, or scarcity."
      };
      const prompt = base + "\n\nTASK: " + instructions[task];
      const response = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey, prompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed.");
      setOutput(data.output);
      setStage(task);
      const project: SavedProject = { id: crypto.randomUUID(), idea, kind, audience, problem, tone, stage: task, output: data.output, updatedAt: Date.now() };
      setSavedProjects(old => {
        const next = [project, ...old.filter(x => x.idea !== idea)].slice(0, 30);
        localStorage.setItem("luonix-projects", JSON.stringify(next));
        return next;
      });
      setTab("preview");
      setStatus("Generation complete · " + selected.name + " · " + model);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("Generation stopped.");
    } finally { setBusy(false); }
  }
  function openProject(project: SavedProject) {
    setIdea(project.idea); setKind(project.kind); setAudience(project.audience); setProblem(project.problem);
    setTone(project.tone); setStage(project.stage); setOutput(project.output); setTab("preview");
    setStatus("Opened saved product · " + new Date(project.updatedAt).toLocaleString());
  }
  function download(ext: "md" | "html") {
    if (!output) return;
    const rendered = DOMPurify.sanitize(marked.parse(output, { async: false }) as string);
    const html = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>Luonix Product</title><style>body{max-width:850px;margin:50px auto;padding:0 24px;font:17px/1.7 system-ui;color:#222}h1,h2,h3{line-height:1.25}blockquote{border-left:3px solid #62a887;padding-left:16px;color:#555}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}</style></head><body>" + rendered + "</body></html>";
    const blob = new Blob([ext === "md" ? output : html], { type: ext === "md" ? "text/markdown" : "text/html" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "luonix-product." + ext; a.click(); URL.revokeObjectURL(url);
  }
  const ready = Boolean(keys[provider]);
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="mark">Ø</span><span>LUONIX</span></div>
      <button className="nav active">✧ <span>Product Studio</span></button>
      <button className="nav" onClick={() => { setOutput(""); setStage("brief"); setIdea(""); setAudience(""); setProblem(""); setStatus("New product started."); }}>＋ <span>New product</span></button>
      <div className="side-label">YOUR LIBRARY</div>
      <div className="library-list">{savedProjects.length ? savedProjects.map(project => <button key={project.id} className="library-item" onClick={() => openProject(project)}><b>{project.idea}</b><small>{project.kind} · {new Date(project.updatedAt).toLocaleDateString()}</small></button>) : <div className="side-note">Your saved products will appear here automatically after generation.</div>}</div>
      <div className="side-bottom"><div className="online-dot"/> Local vault {Object.values(keys).filter(Boolean).length} provider(s) configured</div>
    </aside>
    <section className="main">
      <header className="topbar"><div className="crumb">Studio <span>/</span> Product builder</div><div className="top-actions"><span className="provider-chip">{selected.name}</span><button className="settings-btn" onClick={() => setSettings(!settings)}>⚙ Settings</button></div></header>
      {settings && <section className="settings-panel">
        <div className="settings-head"><div><div className="eyebrow">PERSONAL API CONNECTIONS</div><h2>Key vault</h2><p>Keys are encrypted in this browser and are not saved by Luonix's server.</p></div><button className="close" onClick={() => setSettings(false)}>×</button></div>
        <div className="settings-grid">
          <label>Provider<select value={provider} onChange={e => changeProvider(e.target.value as Provider)}>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Model<input value={model} onChange={e => setModel(e.target.value)} /></label>
          <label className="span-two">Vault passphrase<input type="password" autoComplete="current-password" value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="At least 10 characters · required to unlock keys" /></label>
          <label className="span-two">API key<input type="password" autoComplete="off" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder={"Paste your " + selected.name + " API key"} /></label>
        </div>
        <div className="settings-foot"><span className={ready ? "saved" : "unsaved"}>{ready ? "● Key saved on this device" : "○ No key saved for this provider"}</span><div><button className="text-btn" onClick={removeKey} disabled={!ready}>Remove key</button><button className="primary small" onClick={saveKey} disabled={!keyInput.trim() || passphrase.length < 10}>Encrypt & save</button></div></div>
        <p className="security-note">Security note: use a unique passphrase. Anyone with access to this browser profile and its unlocked session may be able to use your keys. Never paste keys into public repos or screenshots.</p>
      </section>}
      <div className="content">
        <div className="hero"><div className="eyebrow">YOUR AI PRODUCT FACTORY</div><h1>Turn an idea into<br/><span>something real.</span></h1><p>Research the opportunity. Shape the product. Build it. Package it.</p></div>
        <div className="workspace">
          <section className="form-card">
            <div className="section-title"><div><div className="eyebrow">01 / PRODUCT BRIEF</div><h2>What are we creating?</h2></div><span className="step-count">01 — 04</span></div>
            <label>Product idea<textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder="e.g. A practical budgeting system for freelancers who have irregular income..." rows={3}/></label>
            <div className="field-grid">
              <label>Product format<select value={kind} onChange={e => setKind(e.target.value)}>{kinds.map(k => <option key={k}>{k}</option>)}</select></label>
              <label>Writing style<select value={tone} onChange={e => setTone(e.target.value)}>{tones.map(t => <option key={t}>{t}</option>)}</select></label>
            </div>
            <label>Who is it for?<input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Freelancers, first-time founders, students..." /></label>
            <label>What problem should it solve?<input value={problem} onChange={e => setProblem(e.target.value)} placeholder="The specific frustration or outcome..." /></label>
            <div className="engine-row"><div><span className={ready ? "pulse" : "pulse muted"}/><span>{ready ? selected.name + " connected" : "API key required"}</span></div><button className="text-btn" onClick={() => setSettings(true)}>Manage keys ↗</button></div>
            <button className="primary generate" onClick={() => generate("brief")} disabled={busy || !idea.trim() || !ready || !passphrase}>Generate product brief <span>↗</span></button>
            {!ready && <p className="hint">Add an API key in Settings to activate generation.</p>}
          </section>
          <section className="output-card">
            <div className="section-title"><div><div className="eyebrow">02 / WORKBENCH</div><h2>Build your product</h2></div><span className="live-tag">● LIVE WORKSPACE</span></div>
            <div className="workflow">
              {([{id:"brief",n:"01",name:"Opportunity brief",desc:"Find the right angle"},{id:"outline",n:"02",name:"Product outline",desc:"Design the full structure"},{id:"product",n:"03",name:"Create product",desc:"Generate the actual content"},{id:"sales",n:"04",name:"Sales page",desc:"Prepare the offer"}] as const).map(item => <button key={item.id} className={"workflow-item " + (stage === item.id ? "selected" : "")} onClick={() => generate(item.id)} disabled={busy || !idea.trim() || !ready || !passphrase}><span className="workflow-num">{item.n}</span><span className="workflow-copy"><b>{item.name}</b><small>{item.desc}</small></span><span className="arrow">↗</span></button>)}
            </div>
            <div className="status-line">{busy ? <><span className="spinner"/> {status}</> : <><span className="status-dot"/> {status}</>}</div>
            {error && <div className="error">{error}</div>}
            <div className="result-head"><div><div className="eyebrow">03 / PRODUCT OUTPUT</div><h3>{output ? "Your generated work" : "Your canvas is waiting"}</h3></div>{output && <div className="download-actions"><button className="outline-btn" onClick={() => download("md")}>↓ Markdown</button><button className="outline-btn" onClick={() => download("html")}>↓ HTML</button></div>}</div>
            {output ? <><div className="tabs"><button className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>Preview</button><button className={tab === "source" ? "on" : ""} onClick={() => setTab("source")}>Source</button></div>{tab === "preview" ? <article className="preview markdown-preview" dangerouslySetInnerHTML={{ __html: renderedPreview }} /> : <textarea className="source-editor" value={output} onChange={e => setOutput(e.target.value)}/>}</> :
              <div className="empty-canvas"><div className="canvas-symbol">Ø</div><b>A product starts with an idea.</b><p>Your brief, outline, full product and sales page will appear here.</p></div>}
          </section>
        </div>
        <footer><span>LUONIX Ø</span><span>Made to turn ideas into useful things.</span><span>v0.1 · Foundation build</span></footer>
      </div>
    </section>
  </main>;
}
