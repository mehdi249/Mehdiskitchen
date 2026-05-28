import { useState, useRef, useCallback, useEffect } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "mindmap",    label: "Mind Map",              icon: "◈" },
  { id: "research",   label: "Research & Concept",    icon: "◎" },
  { id: "sketches",   label: "Sketches & Ideation",   icon: "◌" },
  { id: "stylecards", label: "Style Cards",            icon: "◫" },
  { id: "patterns",   label: "Pattern Drafting",      icon: "◧" },
  { id: "clo3d",      label: "CLO3D",                 icon: "⬡" },
  { id: "construction","label": "Construction",       icon: "◑" },
  { id: "lookbook",   label: "Lookbook",              icon: "◉" },
];

const STAGE_IDS = STAGES.map(s => s.id);
const stageIdx  = id => STAGE_IDS.indexOf(id);
const pct       = id => Math.round(((stageIdx(id) + 1) / STAGES.length) * 100);

const G = "#c8a96e", DARK = "#0d0d0d", PANEL = "#111111", BORDER = "#1e1e1e";
const DIM = "#3a3a3a", MID = "#6a6a6a", LIGHT = "#d4d0ca";

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED = {
  collections: [
    {
      id: "baran", type: "collection",
      name: "BARAN باران", season: "2026",
      tagline: "Technical apparel meets urban RTW — designed for Vancouver's rain",
      coverColor: "#1a2a38",
      activeStage: "clo3d", manualPct: null,
      palette: ["#2c3e50","#7eb8d4","#c9b8a8","#3d5a70","#1a2a38"],
      stages: {
        mindmap: {
          nodes: [
            { id:"n1", x:320, y:200, text:"BARAN باران" },
            { id:"n2", x:160, y:120, text:"Vancouver Rain" },
            { id:"n3", x:480, y:120, text:"Iranian Heritage" },
            { id:"n4", x:100, y:260, text:"Technical Fabrics" },
            { id:"n5", x:540, y:260, text:"City Life" },
            { id:"n6", x:200, y:340, text:"GoreTex" },
            { id:"n7", x:380, y:340, text:"Urban Professional" },
          ],
          edges: [["n1","n2"],["n1","n3"],["n2","n4"],["n3","n5"],["n4","n6"],["n5","n7"]],
          images: [],
        },
        research: {
          text: "Having moved to Vancouver at age 12, I became acutely aware of the city's unique climate and style landscape — where technical apparel designed only for rugged outdoor use and everyday ready-to-wear collections fell short of meeting the real needs of urban life in a rainy city.\n\nThis collection aims to bridge that gap by thoughtfully merging technical apparel with ready-to-wear and cultural influences, creating versatile apparel that responds to the practical demands of Vancouver's climate while elevating daily urban style.",
          images: [],
          refs: [],
        },
        sketches: { images: [], notes: "Initial ideation — cinched silhouettes, structured shoulders, layering systems." },
        stylecards: {
          pieces: [
            { id:"sc1", name:"Persepolis Pleat Jacket", fabrics:[{layer:"Shell",spec:"100% Nylon GoreTex"},{layer:"Insulation",spec:"Primaloft"},{layer:"Lining",spec:"DWR Cotton Poplin"}], notes:"Two-piece construction. Named after Persian city — pleat detail inspired by architectural columns.", images:[] },
            { id:"sc2", name:"Yazd A-Line Skirt",       fabrics:[{layer:"Self",spec:"100% Nylon GoreTex"},{layer:"Lining",spec:"Moisture Wicking Jersey Mesh"}], notes:"GoreTex skirt. Wind tower architecture → A-line silhouette.", images:[] },
            { id:"sc3", name:"Zayandeh Technical Vest", fabrics:[{layer:"Self",spec:"100% Nylon GoreTex"},{layer:"Insulation",spec:"Primaloft"},{layer:"Lining",spec:"DWR Cotton Poplin"}], notes:"Side-tie signature detail. Primaloft warmth without bulk.", images:[] },
            { id:"sc4", name:"Kerman Shirt",            fabrics:[{layer:"Self",spec:"DWR Cotton Poplin"},{layer:"Contrast",spec:"100% Nylon GoreTex"}], notes:"Tie cuff signature. DWR poplin — water resistant with refined hand.", images:[] },
          ],
        },
        patterns: { images: [], notes: "Drafted in Optitex. Each piece built digitally before any physical work." },
        clo3d:    { images: [], notes: "3D + 2D simulation in CLO3D. Validates silhouette, fit and drape pre-sampling." },
        construction: { images: [], notes: "" },
        lookbook: { images: [], notes: "" },
      },
      createdAt: "2026-01-15",
    },
  ],
};

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const STORE_KEY = "atelier_mehdi_v1";
const load = () => {
  try {
    const raw = window.localStorage && localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const save = data => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {}
};

// ─── TINY HELPERS ─────────────────────────────────────────────────────────────
const uid   = () => Math.random().toString(36).slice(2, 9);
const fmt   = d  => new Date(d).toLocaleDateString("en-CA",{year:"numeric",month:"short"});

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function AtelierMehdi() {
  const [data, setData]             = useState(() => load() || SEED);
  const [view, setView]             = useState("home");        // home | collection | stage
  const [activeId, setActiveId]     = useState(null);
  const [activeStageId, setActiveStageId] = useState(null);
  const [modal, setModal]           = useState(null);          // "new-collection" | "edit-collection" | "new-piece" | "edit-piece" | "confirm-delete"
  const [modalData, setModalData]   = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  // persist on every change
  useEffect(() => { save(data); }, [data]);

  const mutate = fn => setData(d => { const n = JSON.parse(JSON.stringify(d)); fn(n); return n; });

  const col    = data.collections.find(c => c.id === activeId);
  const stage  = col && activeStageId ? col.stages[activeStageId] : null;
  const stageMeta = STAGES.find(s => s.id === activeStageId);

  // ── derived progress ──────────────────────────────────────────────────────
  const getProgress = c => {
    if (c.manualPct !== null && c.manualPct !== undefined) return c.manualPct;
    return pct(c.activeStage);
  };

  // ── navigation ────────────────────────────────────────────────────────────
  const openCollection = id => { setActiveId(id); setActiveStageId(null); setView("collection"); };
  const openStage      = id => { setActiveStageId(id); setView("stage"); };
  const goHome         = ()  => { setView("home"); setActiveId(null); setActiveStageId(null); };
  const goCollection   = ()  => { setActiveStageId(null); setView("collection"); };

  // ── collection CRUD ───────────────────────────────────────────────────────
  const createCollection = form => {
    const id = uid();
    const blank = {};
    STAGE_IDS.forEach(sid => {
      blank[sid] = sid === "mindmap"    ? { nodes:[], edges:[], images:[] }
                 : sid === "stylecards" ? { pieces:[] }
                 : { images:[], notes:"", text:"", refs:[] };
    });
    mutate(d => d.collections.push({
      id, type: form.type || "collection",
      name: form.name, season: form.season || "",
      tagline: form.tagline || "", coverColor: form.coverColor || "#1a1a2e",
      activeStage: "mindmap", manualPct: null,
      palette: [], stages: blank,
      createdAt: new Date().toISOString().slice(0,10),
    }));
    setModal(null);
  };

  const editCollection = form => {
    mutate(d => {
      const c = d.collections.find(x => x.id === activeId);
      Object.assign(c, form);
    });
    setModal(null);
  };

  const deleteCollection = id => {
    mutate(d => { d.collections = d.collections.filter(c => c.id !== id); });
    goHome();
    setModal(null);
  };

  // ── stage helpers ─────────────────────────────────────────────────────────
  const setActiveStage = sid => {
    mutate(d => { d.collections.find(c => c.id === activeId).activeStage = sid; });
  };
  const setManualPct = v => {
    mutate(d => { d.collections.find(c => c.id === activeId).manualPct = v; });
  };

  // ── image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = (files, collId, stageId, subKey) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        mutate(d => {
          const s = d.collections.find(c => c.id === collId).stages[stageId];
          const target = subKey ? s.pieces?.find(p => p.id === subKey)?.images : s.images;
          if (target) target.push({ id: uid(), src: e.target.result, name: file.name });
          else {
            const arr = subKey ? s.pieces?.find(p=>p.id===subKey) : s;
            if (arr) (arr.images = arr.images||[]).push({ id: uid(), src: e.target.result, name: file.name });
          }
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (collId, stageId, imgId, subKey) => {
    mutate(d => {
      const s = d.collections.find(c => c.id === collId).stages[stageId];
      if (subKey) {
        const p = s.pieces?.find(p => p.id === subKey);
        if (p) p.images = p.images.filter(i => i.id !== imgId);
      } else {
        s.images = (s.images||[]).filter(i => i.id !== imgId);
      }
    });
  };

  // ── export ────────────────────────────────────────────────────────────────
  const exportJSON = () => {
    if (!col) return;
    const blob = new Blob([JSON.stringify(col, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${col.name.replace(/\s+/g,"_")}.json`;
    a.click();
  };

  const exportPDF = () => {
    window.print();
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:DARK, color:"#e8e4de",
                  fontFamily:"'Cormorant Garamond','Playfair Display',Georgia,serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Tenor+Sans&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#222}
        .mono{font-family:'Tenor Sans',sans-serif;letter-spacing:.12em}
        .cap{text-transform:uppercase}
        .btn{cursor:pointer;transition:all .22s ease;background:none;border:none;font-family:inherit}
        .ghost{border:1px solid #2a2a2a;color:${MID};padding:8px 18px;font-family:'Tenor Sans',sans-serif;font-size:9px;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;transition:all .22s;background:none}
        .ghost:hover{border-color:${G};color:${G}}
        .ghost-gold{border:1px solid ${G}40;color:${G};padding:8px 18px;font-family:'Tenor Sans',sans-serif;font-size:9px;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;transition:all .22s;background:none}
        .ghost-gold:hover{background:${G}15}
        .card{background:${PANEL};border:1px solid ${BORDER};transition:all .28s ease;cursor:pointer}
        .card:hover{border-color:${G}50;transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,.5)}
        .pill{font-family:'Tenor Sans',sans-serif;font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:3px 9px;border:1px solid #2a2a2a;color:${MID}}
        .pill-g{border-color:${G}50;color:${G}}
        .input{background:#0a0a0a;border:1px solid #2a2a2a;color:#e8e4de;padding:10px 14px;font-family:'Cormorant Garamond',serif;font-size:14px;width:100%;outline:none;transition:border .2s}
        .input:focus{border-color:${G}80}
        .textarea{background:#0a0a0a;border:1px solid #2a2a2a;color:#e8e4de;padding:10px 14px;font-family:'Cormorant Garamond',serif;font-size:13px;width:100%;outline:none;resize:vertical;min-height:120px;line-height:1.7;transition:border .2s}
        .textarea:focus{border-color:${G}80}
        .label{font-family:'Tenor Sans',sans-serif;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:${DIM};margin-bottom:6px;display:block}
        .drop-zone{border:1px dashed #2a2a2a;padding:24px;text-align:center;transition:all .2s;cursor:pointer}
        .drop-zone:hover{border-color:${G}60}
        @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .fi{animation:fi .35s ease forwards}
        .stage-pill{font-family:'Tenor Sans',sans-serif;font-size:8px;letter-spacing:.14em;text-transform:uppercase;padding:4px 10px;border:1px solid #2a2a2a;color:#3a3a3a;cursor:pointer;transition:all .2s;background:none}
        .stage-pill:hover{border-color:${G}60;color:${G}}
        .stage-pill.active-stage{border-color:${G};color:${G};background:${G}12}
        .img-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:12px}
        .img-item{position:relative;aspect-ratio:1;overflow:hidden;background:#0a0a0a;border:1px solid ${BORDER}}
        .img-item img{width:100%;height:100%;object-fit:cover}
        .img-del{position:absolute;top:4px;right:4px;background:rgba(0,0,0,.8);border:none;color:#fff;width:20px;height:20px;font-size:10px;cursor:pointer;display:none;align-items:center;justify-content:center}
        .img-item:hover .img-del{display:flex}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:#111;border:1px solid #2a2a2a;padding:32px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto}
        @media print{.no-print{display:none!important}.print-only{display:block!important}}
        .print-only{display:none}
        .node{position:absolute;background:#111;border:1px solid #2a2a2a;padding:8px 14px;font-size:12px;cursor:move;user-select:none;transition:border .2s;white-space:nowrap}
        .node:hover,.node.selected{border-color:${G}}
        .node-root{border-color:${G}80;color:${G}}
      `}</style>

      {/* ── HOME ─────────────────────────────────────────────────────────── */}
      {view === "home" && (
        <HomeView
          collections={data.collections}
          getProgress={getProgress}
          onOpen={openCollection}
          onCreate={() => setModal("new-collection")}
        />
      )}

      {/* ── COLLECTION ───────────────────────────────────────────────────── */}
      {view === "collection" && col && (
        <CollectionView
          col={col}
          getProgress={getProgress}
          onBack={goHome}
          onOpenStage={openStage}
          onEdit={() => setModal("edit-collection")}
          onDelete={() => { setDeleteTarget(col.id); setModal("confirm-delete"); }}
          onSetActiveStage={setActiveStage}
          onSetManualPct={setManualPct}
          onExportJSON={exportJSON}
          onExportPDF={exportPDF}
        />
      )}

      {/* ── STAGE ────────────────────────────────────────────────────────── */}
      {view === "stage" && col && stage && stageMeta && (
        <StageView
          col={col}
          stage={stage}
          stageMeta={stageMeta}
          stageId={activeStageId}
          onBack={goCollection}
          mutate={mutate}
          handleImageUpload={handleImageUpload}
          removeImage={removeImage}
        />
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────── */}
      {modal === "new-collection" && (
        <CollectionFormModal
          title="New Project"
          onSave={createCollection}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "edit-collection" && col && (
        <CollectionFormModal
          title="Edit Project"
          initial={col}
          onSave={editCollection}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "confirm-delete" && (
        <ConfirmModal
          message={`Delete "${data.collections.find(c=>c.id===deleteTarget)?.name}"? This cannot be undone.`}
          onConfirm={() => deleteCollection(deleteTarget)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({ collections, getProgress, onOpen, onCreate }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {/* header */}
      <header style={{ padding:"40px 48px 32px", borderBottom:`1px solid ${BORDER}`,
                       display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <div style={{ fontSize:"32px", fontWeight:300, letterSpacing:".06em", lineHeight:1 }}>Atelier</div>
          <div className="mono cap" style={{ fontSize:"10px", color:G, marginTop:"5px" }}>by Mehdi</div>
        </div>
        <button className="ghost-gold" onClick={onCreate}>+ New Project</button>
      </header>

      {/* grid */}
      <div style={{ flex:1, padding:"40px 48px" }}>
        <div className="mono cap" style={{ fontSize:"8px", color:DIM, letterSpacing:".22em", marginBottom:"24px" }}>
          {collections.length} Project{collections.length !== 1 ? "s" : ""}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"16px" }}>
          {collections.map((c, i) => (
            <CollectionCard key={c.id} c={c} progress={getProgress(c)} onOpen={onOpen} delay={i * 60} />
          ))}
          {/* add card */}
          <div onClick={onCreate} style={{ background:"transparent", border:`1px dashed #2a2a2a`,
                 minHeight:"200px", display:"flex", alignItems:"center", justifyContent:"center",
                 cursor:"pointer", transition:"border .25s" }}
               onMouseEnter={e=>e.currentTarget.style.borderColor=G+"60"}
               onMouseLeave={e=>e.currentTarget.style.borderColor="#2a2a2a"}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"28px", color:DIM, marginBottom:"8px" }}>+</div>
              <div className="mono cap" style={{ fontSize:"9px", color:DIM }}>New Project</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionCard({ c, progress, onOpen, delay }) {
  return (
    <div className="card fi" onClick={() => onOpen(c.id)}
         style={{ animationDelay:`${delay}ms`, overflow:"hidden" }}>
      {/* cover */}
      <div style={{ height:"120px", background:`linear-gradient(135deg, ${c.coverColor}, ${c.coverColor}88)`,
                    display:"flex", alignItems:"flex-end", padding:"14px", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.5))" }}/>
        <div style={{ position:"relative" }}>
          <div style={{ fontSize:"18px", fontWeight:300, lineHeight:1, color:"#fff" }}>{c.name}</div>
          {c.season && <div className="mono" style={{ fontSize:"9px", color:"rgba(255,255,255,.5)", marginTop:"3px" }}>{c.season}</div>}
        </div>
      </div>
      {/* body */}
      <div style={{ padding:"16px" }}>
        {c.tagline && <div style={{ fontSize:"12px", color:MID, fontStyle:"italic", marginBottom:"12px", lineHeight:1.5 }}>{c.tagline}</div>}
        {/* progress bar */}
        <div style={{ height:"1px", background:"#1a1a1a", marginBottom:"8px" }}>
          <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg,${G},#e8d4a8)`, transition:"width .6s" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span className="mono cap" style={{ fontSize:"8px", color:DIM }}>
            {STAGES.find(s => s.id === c.activeStage)?.label}
          </span>
          <span className="mono" style={{ fontSize:"9px", color:G }}>{progress}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── COLLECTION VIEW ──────────────────────────────────────────────────────────
function CollectionView({ col, getProgress, onBack, onOpenStage, onEdit, onDelete,
                           onSetActiveStage, onSetManualPct, onExportJSON, onExportPDF }) {
  const [showPctInput, setShowPctInput] = useState(false);
  const [pctVal, setPctVal]             = useState(col.manualPct ?? "");
  const progress = getProgress(col);

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }} className="fi">
      {/* header */}
      <header style={{ padding:"28px 48px 20px", borderBottom:`1px solid ${BORDER}`,
                       display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:"20px" }}>
          <button className="btn" onClick={onBack} style={{ color:DIM, fontSize:"11px", letterSpacing:".15em" }}>
            <span className="mono cap">← Atelier</span>
          </button>
          <div>
            <div style={{ fontSize:"26px", fontWeight:300, letterSpacing:".04em", lineHeight:1 }}>{col.name}</div>
            {col.tagline && <div style={{ fontSize:"12px", color:MID, fontStyle:"italic", marginTop:"4px" }}>{col.tagline}</div>}
          </div>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <button className="ghost" onClick={onExportJSON}>Export JSON</button>
          <button className="ghost" onClick={onExportPDF}>Export PDF</button>
          <button className="ghost" onClick={onEdit}>Edit</button>
          <button className="ghost" onClick={onDelete} style={{ color:"#6a3a3a", borderColor:"#3a1a1a" }}>Delete</button>
        </div>
      </header>

      <div style={{ flex:1, overflowY:"auto", padding:"32px 48px" }}>
        {/* progress row */}
        <div style={{ background:PANEL, border:`1px solid ${BORDER}`, padding:"20px 24px", marginBottom:"32px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
            <div className="mono cap" style={{ fontSize:"9px", color:DIM }}>Project Progress</div>
            <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
              {showPctInput ? (
                <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                  <input type="number" min="0" max="100" value={pctVal}
                         onChange={e => setPctVal(e.target.value)}
                         style={{ width:"60px", background:"#0a0a0a", border:`1px solid ${G}60`,
                                  color:"#e8e4de", padding:"4px 8px", fontFamily:"'Tenor Sans',sans-serif",
                                  fontSize:"11px", outline:"none" }} />
                  <button className="ghost-gold" style={{ padding:"4px 10px" }}
                          onClick={() => { onSetManualPct(parseInt(pctVal)||null); setShowPctInput(false); }}>
                    Set
                  </button>
                  <button className="ghost" style={{ padding:"4px 10px" }}
                          onClick={() => { onSetManualPct(null); setShowPctInput(false); }}>
                    Auto
                  </button>
                </div>
              ) : (
                <button className="ghost" style={{ padding:"4px 12px" }} onClick={() => setShowPctInput(true)}>
                  {col.manualPct !== null && col.manualPct !== undefined ? "Manual: " + col.manualPct + "%" : "Override %"}
                </button>
              )}
              <span className="mono" style={{ fontSize:"16px", color:G }}>{progress}%</span>
            </div>
          </div>
          {/* stage track */}
          <div style={{ display:"flex", gap:"4px", marginBottom:"10px" }}>
            {STAGES.map((s, i) => {
              const done = stageIdx(col.activeStage) >= i;
              const curr = col.activeStage === s.id;
              return (
                <div key={s.id} style={{ flex:1, height:"3px",
                                          background: done ? G : "#1a1a1a",
                                          cursor:"pointer", transition:"background .3s",
                                          opacity: curr ? 1 : done ? 0.7 : 1 }}
                     onClick={() => onSetActiveStage(s.id)}
                     title={s.label} />
              );
            })}
          </div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            {STAGES.map(s => (
              <button key={s.id} className={`stage-pill ${col.activeStage===s.id?"active-stage":""}`}
                      onClick={() => onSetActiveStage(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* palette */}
        {col.palette?.length > 0 && (
          <div style={{ marginBottom:"28px" }}>
            <div className="label">Palette</div>
            <div style={{ display:"flex", gap:"8px" }}>
              {col.palette.map((c, i) => (
                <div key={i} style={{ width:"40px", height:"40px", background:c, border:`1px solid #2a2a2a` }} />
              ))}
            </div>
          </div>
        )}

        {/* stage cards */}
        <div className="mono cap" style={{ fontSize:"8px", color:DIM, marginBottom:"16px", letterSpacing:".22em" }}>
          Stages
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"12px" }}>
          {STAGES.map((s, i) => {
            const done  = stageIdx(col.activeStage) >= i;
            const curr  = col.activeStage === s.id;
            return (
              <div key={s.id} className="card" onClick={() => onOpenStage(s.id)}
                   style={{ padding:"20px", borderColor: curr ? G+"60" : done ? G+"20" : BORDER }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                  <span style={{ fontSize:"18px", color: curr ? G : done ? G+"80" : DIM }}>{s.icon}</span>
                  {curr && <span className="pill pill-g" style={{ fontSize:"7px" }}>Current</span>}
                  {done && !curr && <span className="pill" style={{ fontSize:"7px", color:"#4a4a4a" }}>Done</span>}
                </div>
                <div style={{ fontSize:"13px", color: curr ? LIGHT : done ? "#8a8a8a" : MID }}>{s.label}</div>
                <div className="mono" style={{ fontSize:"8px", color:DIM, marginTop:"6px" }}>0{i+1}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── STAGE VIEW ───────────────────────────────────────────────────────────────
function StageView({ col, stage, stageMeta, stageId, onBack, mutate, handleImageUpload, removeImage }) {
  const fileRef = useRef();

  const updateNote = val => mutate(d => {
    const s = d.collections.find(c=>c.id===col.id).stages[stageId];
    s.notes = val;
  });
  const updateText = val => mutate(d => {
    const s = d.collections.find(c=>c.id===col.id).stages[stageId];
    s.text = val;
  });
  const addRef = url => mutate(d => {
    const s = d.collections.find(c=>c.id===col.id).stages[stageId];
    if (!s.refs) s.refs = [];
    s.refs.push({ id: uid(), url });
  });
  const removeRef = id => mutate(d => {
    const s = d.collections.find(c=>c.id===col.id).stages[stageId];
    s.refs = (s.refs||[]).filter(r => r.id !== id);
  });

  // style cards piece management
  const addPiece = () => mutate(d => {
    d.collections.find(c=>c.id===col.id).stages.stylecards.pieces.push({
      id: uid(), name:"New Piece", fabrics:[], notes:"", images:[]
    });
  });
  const updatePiece = (pid, field, val) => mutate(d => {
    const p = d.collections.find(c=>c.id===col.id).stages.stylecards.pieces.find(x=>x.id===pid);
    p[field] = val;
  });
  const removePiece = pid => mutate(d => {
    const sc = d.collections.find(c=>c.id===col.id).stages.stylecards;
    sc.pieces = sc.pieces.filter(p=>p.id!==pid);
  });
  const addFabric = pid => mutate(d => {
    const p = d.collections.find(c=>c.id===col.id).stages.stylecards.pieces.find(x=>x.id===pid);
    p.fabrics.push({ layer:"Layer", spec:"Spec" });
  });
  const updateFabric = (pid, fi, field, val) => mutate(d => {
    const p = d.collections.find(c=>c.id===col.id).stages.stylecards.pieces.find(x=>x.id===pid);
    p.fabrics[fi][field] = val;
  });
  const removeFabric = (pid, fi) => mutate(d => {
    const p = d.collections.find(c=>c.id===col.id).stages.stylecards.pieces.find(x=>x.id===pid);
    p.fabrics.splice(fi, 1);
  });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }} className="fi">
      <header style={{ padding:"24px 48px 18px", borderBottom:`1px solid ${BORDER}`,
                       display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
          <button className="btn" onClick={onBack} style={{ color:DIM }}>
            <span className="mono cap" style={{ fontSize:"10px", letterSpacing:".15em" }}>← {col.name}</span>
          </button>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"20px", color:G }}>{stageMeta.icon}</span>
              <span style={{ fontSize:"22px", fontWeight:300 }}>{stageMeta.label}</span>
            </div>
          </div>
        </div>
      </header>

      <div style={{ flex:1, overflowY:"auto", padding:"32px 48px" }}>

        {/* ── MIND MAP ── */}
        {stageId === "mindmap" && (
          <MindMapStage stage={stage} colId={col.id} mutate={mutate}
                        handleImageUpload={handleImageUpload} removeImage={removeImage} />
        )}

        {/* ── RESEARCH ── */}
        {stageId === "research" && (
          <div>
            <div className="label">Research Narrative</div>
            <textarea className="textarea" value={stage.text || ""} rows={8}
                      onChange={e => updateText(e.target.value)}
                      placeholder="Write your research, concept statement, cultural references, market analysis..." />
            <div style={{ marginTop:"24px" }}>
              <div className="label">Reference Links</div>
              <RefLinks refs={stage.refs||[]} onAdd={addRef} onRemove={removeRef} />
            </div>
            <div style={{ marginTop:"24px" }}>
              <div className="label">Reference Images</div>
              <ImageGrid images={stage.images||[]} colId={col.id} stageId={stageId}
                         onUpload={handleImageUpload} onRemove={removeImage} />
            </div>
            <div style={{ marginTop:"24px" }}>
              <div className="label">Notes</div>
              <textarea className="textarea" value={stage.notes || ""} rows={4}
                        onChange={e => updateNote(e.target.value)} placeholder="Additional notes..." />
            </div>
          </div>
        )}

        {/* ── SKETCHES / PATTERNS / CLO3D / CONSTRUCTION / LOOKBOOK ── */}
        {["sketches","patterns","clo3d","construction","lookbook"].includes(stageId) && (
          <div>
            <div className="label">Notes</div>
            <textarea className="textarea" value={stage.notes || ""} rows={5}
                      onChange={e => updateNote(e.target.value)}
                      placeholder={stageId==="sketches" ? "Ideation notes, AI prompts used, technique explorations..."
                                 : stageId==="patterns"  ? "Software used (Optitex, etc.), construction notes..."
                                 : stageId==="clo3d"     ? "CLO3D simulation notes, fit observations..."
                                 : stageId==="construction" ? "Draping notes, sampling iterations, fit session notes..."
                                 : "Final photography notes, styling direction..."} />
            <div style={{ marginTop:"24px" }}>
              <div className="label">Images</div>
              <ImageGrid images={stage.images||[]} colId={col.id} stageId={stageId}
                         onUpload={handleImageUpload} onRemove={removeImage} />
            </div>
            {(stageId==="sketches"||stageId==="research") && (
              <div style={{ marginTop:"24px" }}>
                <div className="label">Reference Links</div>
                <RefLinks refs={stage.refs||[]} onAdd={addRef} onRemove={removeRef} />
              </div>
            )}
          </div>
        )}

        {/* ── STYLE CARDS ── */}
        {stageId === "stylecards" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
              <div className="label" style={{ margin:0 }}>{stage.pieces?.length || 0} Pieces</div>
              <button className="ghost-gold" onClick={addPiece}>+ Add Piece</button>
            </div>
            {(stage.pieces||[]).map(p => (
              <StyleCardPiece key={p.id} piece={p} colId={col.id} stageId={stageId}
                              onUpdatePiece={updatePiece} onRemovePiece={removePiece}
                              onAddFabric={addFabric} onUpdateFabric={updateFabric} onRemoveFabric={removeFabric}
                              handleImageUpload={handleImageUpload} removeImage={removeImage} />
            ))}
            {(!stage.pieces || stage.pieces.length === 0) && (
              <div style={{ textAlign:"center", padding:"48px 0", color:DIM }}>
                <div style={{ fontSize:"24px", marginBottom:"8px" }}>◫</div>
                <div className="mono cap" style={{ fontSize:"9px" }}>No pieces yet</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MIND MAP ─────────────────────────────────────────────────────────────────
function MindMapStage({ stage, colId, mutate, handleImageUpload, removeImage }) {
  const [dragging, setDragging]   = useState(null);
  const [selected, setSelected]   = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [editText, setEditText]   = useState("");
  const [offset, setOffset]       = useState({ x:0, y:0 });
  const canvasRef = useRef();
  const fileRef   = useRef();

  const nodes = stage.nodes || [];
  const edges = stage.edges || [];

  const addNode = () => mutate(d => {
    const s = d.collections.find(c=>c.id===colId).stages.mindmap;
    s.nodes.push({ id: uid(), x: 200 + Math.random()*200, y: 150 + Math.random()*150, text:"New Idea" });
  });
  const updateNode = (id, text) => mutate(d => {
    const n = d.collections.find(c=>c.id===colId).stages.mindmap.nodes.find(x=>x.id===id);
    if (n) n.text = text;
  });
  const removeNode = id => mutate(d => {
    const s = d.collections.find(c=>c.id===colId).stages.mindmap;
    s.nodes = s.nodes.filter(n=>n.id!==id);
    s.edges = s.edges.filter(e=>e[0]!==id && e[1]!==id);
  });
  const moveNode = (id, x, y) => mutate(d => {
    const n = d.collections.find(c=>c.id===colId).stages.mindmap.nodes.find(x=>x.id===id);
    if (n) { n.x = x; n.y = y; }
  });
  const addEdge = (a, b) => mutate(d => {
    const s = d.collections.find(c=>c.id===colId).stages.mindmap;
    if (!s.edges.find(e=>(e[0]===a&&e[1]===b)||(e[0]===b&&e[1]===a)))
      s.edges.push([a,b]);
  });
  const removeEdge = (a, b) => mutate(d => {
    const s = d.collections.find(c=>c.id===colId).stages.mindmap;
    s.edges = s.edges.filter(e=>!((e[0]===a&&e[1]===b)||(e[0]===b&&e[1]===a)));
  });

  const onMouseDown = (e, id) => {
    if (e.button !== 0) return;
    const n = nodes.find(x=>x.id===id);
    setDragging(id);
    setOffset({ x: e.clientX - n.x, y: e.clientY - n.y });
    e.stopPropagation();
  };
  const onMouseMove = useCallback(e => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    moveNode(dragging, e.clientX - offset.x, e.clientY - offset.y);
  }, [dragging, offset]);
  const onMouseUp = () => setDragging(null);

  const nodeMap = Object.fromEntries(nodes.map(n=>[n.id,n]));

  return (
    <div>
      <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
        <button className="ghost-gold" onClick={addNode}>+ Add Node</button>
        <button className="ghost" onClick={() => setConnecting(connecting ? null : "start")}>
          {connecting ? "Cancel Connect" : "Connect Nodes"}
        </button>
        <button className="ghost" onClick={() => fileRef.current?.click()}>Import Image</button>
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:"none" }}
               onChange={e => handleImageUpload(e.target.files, colId, "mindmap")} />
        {connecting && <span className="mono cap" style={{ fontSize:"8px", color:G, alignSelf:"center" }}>
          Click node 1 → node 2 to connect
        </span>}
      </div>

      {/* canvas */}
      <div ref={canvasRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
           style={{ width:"100%", height:"440px", background:"#0a0a0a", border:`1px solid ${BORDER}`,
                    position:"relative", overflow:"hidden", cursor:"default" }}>
        {/* edges as SVG */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
          {edges.map(([a,b], i) => {
            const na = nodeMap[a], nb = nodeMap[b];
            if (!na || !nb) return null;
            return (
              <line key={i} x1={na.x+40} y1={na.y+16} x2={nb.x+40} y2={nb.y+16}
                    stroke="#2a2a2a" strokeWidth="1"
                    style={{ cursor:"pointer" }}
                    onClick={() => removeEdge(a,b)} />
            );
          })}
        </svg>

        {nodes.map((n, i) => (
          <div key={n.id}
               className={`node ${i===0?"node-root":""} ${selected===n.id?"selected":""}`}
               style={{ left:n.x, top:n.y }}
               onMouseDown={e => {
                 if (connecting === "start") { setConnecting(n.id); setSelected(n.id); return; }
                 if (typeof connecting === "string" && connecting !== "start") {
                   addEdge(connecting, n.id); setConnecting(null); setSelected(null); return;
                 }
                 onMouseDown(e, n.id); setSelected(n.id);
               }}
               onDoubleClick={() => { setEditingNode(n.id); setEditText(n.text); }}>
            {editingNode === n.id ? (
              <input autoFocus value={editText}
                     onChange={e => setEditText(e.target.value)}
                     onBlur={() => { updateNode(n.id, editText); setEditingNode(null); }}
                     onKeyDown={e => { if (e.key==="Enter") { updateNode(n.id, editText); setEditingNode(null); }}}
                     style={{ background:"transparent", border:"none", color:"inherit",
                              fontFamily:"inherit", fontSize:"inherit", outline:"none", width:"auto" }} />
            ) : (
              <span>{n.text}</span>
            )}
            <button onClick={e => { e.stopPropagation(); removeNode(n.id); }}
                    style={{ position:"absolute", top:"-6px", right:"-6px", background:"#1a1a1a",
                             border:`1px solid ${BORDER}`, color:MID, width:"14px", height:"14px",
                             fontSize:"9px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              ×
            </button>
          </div>
        ))}
        {nodes.length === 0 && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                        justifyContent:"center", color:DIM }}>
            <div className="mono cap" style={{ fontSize:"9px" }}>Add nodes to start your mind map</div>
          </div>
        )}
      </div>
      <div className="mono cap" style={{ fontSize:"8px", color:DIM, marginTop:"6px" }}>
        Drag nodes · Double-click to edit · Click edge to remove · Use "Connect Nodes" to link ideas
      </div>

      {/* imported images */}
      {(stage.images||[]).length > 0 && (
        <div style={{ marginTop:"20px" }}>
          <div className="label">Imported References</div>
          <ImageGrid images={stage.images||[]} colId={colId} stageId="mindmap"
                     onUpload={handleImageUpload} onRemove={removeImage} hideUpload />
        </div>
      )}
    </div>
  );
}

// ─── STYLE CARD PIECE ─────────────────────────────────────────────────────────
function StyleCardPiece({ piece, colId, stageId, onUpdatePiece, onRemovePiece,
                           onAddFabric, onUpdateFabric, onRemoveFabric,
                           handleImageUpload, removeImage }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background:PANEL, border:`1px solid ${BORDER}`, marginBottom:"16px" }}>
      <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between",
                    alignItems:"center", borderBottom: open ? `1px solid ${BORDER}` : "none",
                    cursor:"pointer" }} onClick={() => setOpen(!open)}>
        <input value={piece.name} onClick={e=>e.stopPropagation()}
               onChange={e => onUpdatePiece(piece.id, "name", e.target.value)}
               style={{ background:"transparent", border:"none", color:LIGHT, fontSize:"16px",
                        fontFamily:"'Cormorant Garamond',serif", outline:"none", flex:1 }} />
        <div style={{ display:"flex", gap:"8px" }}>
          <button className="ghost" style={{ padding:"3px 10px" }}
                  onClick={e=>{e.stopPropagation();onRemovePiece(piece.id)}}>Remove</button>
          <span style={{ color:DIM, fontSize:"12px" }}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding:"20px" }}>
          {/* fabrics */}
          <div className="label">Fabric Spec</div>
          {piece.fabrics.map((f, fi) => (
            <div key={fi} style={{ display:"flex", gap:"8px", marginBottom:"6px", alignItems:"center" }}>
              <input value={f.layer} placeholder="Layer" onChange={e=>onUpdateFabric(piece.id,fi,"layer",e.target.value)}
                     style={{ width:"130px", background:"#0a0a0a", border:`1px solid #2a2a2a`, color:MID,
                              padding:"6px 10px", fontFamily:"'Tenor Sans',sans-serif", fontSize:"10px",
                              letterSpacing:".1em", textTransform:"uppercase", outline:"none" }} />
              <input value={f.spec} placeholder="Specification" onChange={e=>onUpdateFabric(piece.id,fi,"spec",e.target.value)}
                     style={{ flex:1, background:"#0a0a0a", border:`1px solid #2a2a2a`, color:LIGHT,
                              padding:"6px 10px", fontFamily:"'Cormorant Garamond',serif", fontSize:"13px", outline:"none" }} />
              <button className="btn" onClick={()=>onRemoveFabric(piece.id,fi)}
                      style={{ color:DIM, fontSize:"14px", padding:"4px" }}>×</button>
            </div>
          ))}
          <button className="ghost" style={{ padding:"4px 12px", marginTop:"4px", marginBottom:"16px" }}
                  onClick={()=>onAddFabric(piece.id)}>+ Fabric Layer</button>

          {/* notes */}
          <div className="label">Construction Notes</div>
          <textarea className="textarea" value={piece.notes||""} rows={3}
                    onChange={e=>onUpdatePiece(piece.id,"notes",e.target.value)}
                    placeholder="Construction details, fit notes, signature details..." />

          {/* images */}
          <div style={{ marginTop:"16px" }}>
            <div className="label">Images</div>
            <ImageGrid images={piece.images||[]} colId={colId} stageId={stageId} subKey={piece.id}
                       onUpload={handleImageUpload} onRemove={removeImage} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IMAGE GRID ───────────────────────────────────────────────────────────────
function ImageGrid({ images, colId, stageId, subKey, onUpload, onRemove, hideUpload }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  const handleDrop = e => {
    e.preventDefault(); setDrag(false);
    onUpload(e.dataTransfer.files, colId, stageId, subKey);
  };

  return (
    <div>
      {!hideUpload && (
        <div className="drop-zone"
             style={{ borderColor: drag ? G+"60" : undefined }}
             onDragOver={e=>{e.preventDefault();setDrag(true)}}
             onDragLeave={()=>setDrag(false)}
             onDrop={handleDrop}
             onClick={() => ref.current?.click()}>
          <div className="mono cap" style={{ fontSize:"9px", color:DIM }}>
            Drag & drop images or click to browse
          </div>
          <div className="mono cap" style={{ fontSize:"8px", color:"#2a2a2a", marginTop:"4px" }}>
            Camera roll · Screenshots · Exports from Procreate
          </div>
          <input ref={ref} type="file" multiple accept="image/*" style={{ display:"none" }}
                 onChange={e=>onUpload(e.target.files, colId, stageId, subKey)} />
        </div>
      )}
      {images.length > 0 && (
        <div className="img-grid">
          {images.map(img => (
            <div key={img.id} className="img-item">
              <img src={img.src} alt={img.name} />
              <button className="img-del" onClick={() => onRemove(colId, stageId, img.id, subKey)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── REF LINKS ────────────────────────────────────────────────────────────────
function RefLinks({ refs, onAdd, onRemove }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div style={{ display:"flex", gap:"8px", marginBottom:"10px" }}>
        <input className="input" value={val} placeholder="https://..."
               onChange={e=>setVal(e.target.value)}
               onKeyDown={e=>{ if(e.key==="Enter"&&val.trim()){ onAdd(val.trim()); setVal(""); }}}
               style={{ flex:1 }} />
        <button className="ghost-gold" onClick={()=>{ if(val.trim()){ onAdd(val.trim()); setVal(""); }}}>
          Add
        </button>
      </div>
      {refs.map(r => (
        <div key={r.id} style={{ display:"flex", gap:"8px", alignItems:"center",
                                  padding:"6px 0", borderBottom:`1px solid #1a1a1a` }}>
          <a href={r.url} target="_blank" rel="noreferrer"
             style={{ color:G, fontSize:"12px", flex:1, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.url}</a>
          <button className="btn" onClick={()=>onRemove(r.id)} style={{ color:DIM, fontSize:"14px" }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── COLLECTION FORM MODAL ────────────────────────────────────────────────────
function CollectionFormModal({ title, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name:       initial?.name       || "",
    season:     initial?.season     || "",
    tagline:    initial?.tagline    || "",
    coverColor: initial?.coverColor || "#1a2a38",
    type:       initial?.type       || "collection",
    manualPct:  initial?.manualPct  ?? null,
  });
  const COLORS = ["#1a2a38","#2c1a1a","#1a2c1a","#2a1a2c","#2c2a1a","#1a1a2c","#1a1a1a","#2a2a2a"];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:"20px", fontWeight:300, marginBottom:"24px" }}>{title}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="BARAN باران" />
          </div>
          <div>
            <label className="label">Season / Year</label>
            <input className="input" value={form.season} onChange={e=>setForm(f=>({...f,season:e.target.value}))} placeholder="2026" />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input className="input" value={form.tagline} onChange={e=>setForm(f=>({...f,tagline:e.target.value}))} placeholder="Short description..." />
          </div>
          <div>
            <label className="label">Type</label>
            <div style={{ display:"flex", gap:"8px" }}>
              {["collection","single"].map(t => (
                <button key={t} className={form.type===t?"ghost-gold":"ghost"}
                        onClick={()=>setForm(f=>({...f,type:t}))}
                        style={{ padding:"6px 14px" }}>
                  {t==="collection"?"Collection":"Single Style"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Cover Colour</label>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {COLORS.map(c => (
                <div key={c} onClick={()=>setForm(f=>({...f,coverColor:c}))}
                     style={{ width:"32px", height:"32px", background:c, cursor:"pointer",
                              border: form.coverColor===c ? `2px solid ${G}` : "2px solid transparent" }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", marginTop:"28px", justifyContent:"flex-end" }}>
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="ghost-gold" onClick={()=>{ if(form.name.trim()) onSave(form); }}>
            {initial ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:"380px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:"16px", color:LIGHT, marginBottom:"24px", lineHeight:1.6 }}>{message}</div>
        <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end" }}>
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button onClick={onConfirm}
                  style={{ background:"#2a1a1a", border:`1px solid #6a3a3a`, color:"#c88a8a",
                           padding:"8px 18px", fontFamily:"'Tenor Sans',sans-serif",
                           fontSize:"9px", letterSpacing:".2em", textTransform:"uppercase", cursor:"pointer" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
