// Inkwell Mini stylesheet (served verbatim at /assets/mini.css). The design is
// the approved board: cool off-white, Inkress navy ink, one merchant accent
// (--accent) on the main button, Add links and the quote rule. Ruled cells,
// one dark band, 0-8px corners (--r).
export const ASSETS_CSS = String.raw`
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:#F6F7F8;color:#13123A;font:400 16px/1.55 'Hanken Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
img{max-width:100%;display:block}
button{font:inherit;color:inherit}
h1,h2,h3{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:600;letter-spacing:-.02em;margin:0}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.muted{color:#5B6170}
.eyebrow{margin:0 0 14px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#5B6170}
.eyebrow.ok{color:var(--accent)}
.ico{width:18px;height:18px;flex:none}

.top{border-bottom:1px solid #E3E6E9;background:#F6F7F8;position:sticky;top:0;z-index:5}
.top-in{height:56px;display:flex;align-items:center;gap:28px}
.brand{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:600;font-size:18px;letter-spacing:-.01em;text-decoration:none;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav{display:none;gap:24px;font-size:14px}
.nav a{text-decoration:none;color:#5B6170}
.bagbtn{height:44px;border:0;background:none;font-size:14px;font-weight:500;cursor:pointer;padding:0}
.bagbtn span{color:#5B6170;font-variant-numeric:tabular-nums}

.btn{height:48px;padding:0 20px;border-radius:var(--r);display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:600;text-decoration:none;border:1px solid transparent;cursor:pointer}
.btn.solid{background:var(--accent);color:#fff}
.btn.ghost{border-color:#C9CED4;background:#fff;font-weight:500}
.btn.light{background:#fff;color:#13123A;height:44px}
.btn.grow{flex:1}
.btn:disabled{opacity:.6;cursor:default}
.btn:focus-visible,.add:focus-visible,.cell-open:focus-visible,.tabs button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.hero{padding-top:36px}
.hero h1{font-size:34px;line-height:1.08;max-width:18ch}
.lede{margin:14px 0 0;color:#3C4152;max-width:46ch}
.actions{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap}
.actions.col{flex-direction:column;max-width:360px}
.how{list-style:none;margin:24px 0 0;padding:14px 0 0;border-top:1px solid #DDE1E5;display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:#3C4152}
.hero.centred{text-align:center}
.hero.centred h1,.hero.centred .lede{margin-left:auto;margin-right:auto}
.hero.centred .actions,.hero.centred .how{justify-content:center}

.list{padding-top:40px}
.list-head{display:flex;align-items:baseline;justify-content:space-between}
.list-head h2{font-size:24px}
.count{font-size:13px;color:#5B6170}
.tabs{display:flex;gap:22px;margin-top:8px;overflow-x:auto;scrollbar-width:none}
.tabs button{height:44px;padding:0;border:0;border-bottom:2px solid transparent;background:none;font-size:14px;color:#5B6170;white-space:nowrap;cursor:pointer}
.tabs button[aria-selected=true]{border-bottom-color:#13123A;color:#13123A;font-weight:600}
.empty{margin:16px 0 0;padding:20px;background:#fff;border:1px solid #DDE1E5;color:#3C4152}
.grid{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid #DDE1E5;border-left:1px solid #DDE1E5}
.cell{background:#fff;display:flex;flex-direction:column;min-height:124px;min-width:0;border-right:1px solid #DDE1E5;border-bottom:1px solid #DDE1E5}
.cell[hidden]{display:none}
.cell-img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#E4E8EA}
.cell-open{flex:1;border:0;background:none;text-align:left;padding:14px 14px 0;display:flex;flex-direction:column;gap:3px;cursor:pointer;min-width:0}
.cell-name{font-size:15px;font-weight:600;line-height:1.3}
.cell-note{font-size:13px;line-height:1.4;color:#5B6170;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.cell-foot{display:flex;align-items:center;justify-content:space-between;padding:4px 10px 4px 14px}
.price{font-size:15px;font-weight:500;font-variant-numeric:tabular-nums}
.add{height:40px;padding:0 4px;border:0;background:none;color:var(--accent);font-weight:600;font-size:14px;cursor:pointer}
.cell.sold .cell-name,.cell.sold .price{color:#8A909B}

.band{margin-top:48px;background:#13123A;color:#fff}
.band-in{padding-top:48px;padding-bottom:52px;display:grid;gap:36px}
.kicker{margin:0 0 14px;font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#A9ACC6}
.about .lead{margin:0;font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:500;font-size:24px;line-height:1.3;letter-spacing:-.01em}
.about .body{margin:14px 0 0;font-size:15px;line-height:1.65;color:#C9CBDD;max-width:60ch}
.quote{margin:0;padding-top:24px;border-top:1px solid rgba(255,255,255,.16)}
.quote blockquote{margin:0;font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:500;font-size:20px;line-height:1.35}
.quote figcaption{margin-top:12px;font-size:13px;color:#A9ACC6}

.visit{padding-top:48px;display:grid;gap:24px}
.visit h2{font-size:24px;margin-bottom:10px}
.addr{margin:0;color:#3C4152}
.contact{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px;margin-top:16px}
.contact .btn{padding:0 10px;font-size:14px}
.links{margin:18px 0 0;display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px}
.links a{text-underline-offset:3px}
.hours{margin:0;border-top:1px solid #DDE1E5}
.hours div{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #E8EBEE}
.hours dt{color:#3C4152}
.hours dd{margin:0;font-variant-numeric:tabular-nums}

.foot{margin-top:44px;padding-top:18px;padding-bottom:110px;border-top:1px solid #DDE1E5;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;color:#5B6170}
.by{display:flex;align-items:center;gap:6px;text-decoration:none}
.by img{height:15px;width:auto}

.bagbar{position:fixed;left:0;right:0;bottom:0;z-index:6;background:#13123A;color:#fff}
.bagbar[hidden]{display:none}
.bagbar-in{height:72px;display:flex;align-items:center;justify-content:space-between}
.bagbar-sum{display:flex;flex-direction:column;font-size:12px;color:#A9ACC6}
.bagbar-sum strong{font-size:17px;color:#fff;font-variant-numeric:tabular-nums}

.sheet{border:0;padding:0;margin:auto auto 0;width:100%;max-width:560px;max-height:92vh;background:#F6F7F8;color:#13123A;border-radius:12px 12px 0 0}
.sheet::backdrop{background:rgba(19,18,58,.45)}
.sheet-in{display:flex;flex-direction:column;gap:14px;padding:8px 20px 20px;max-height:92vh;overflow:auto}
.sheet-top{display:flex;align-items:center;justify-content:space-between;min-height:44px}
.sheet-top h2{font-size:20px}
.sheet-top .eyebrow{margin:0}
.x{width:44px;height:44px;border:0;background:none;font-size:26px;line-height:1;cursor:pointer;margin-right:-10px}
.sheet h2#sheet-title{font-size:26px;line-height:1.1}
.sheet-price{display:flex;justify-content:space-between;align-items:baseline}
.sheet-price .price{font-size:18px}
.sheet-img{width:100%;max-height:260px;object-fit:cover;border-radius:2px}
.sheet-desc{margin:0;color:#3C4152;font-size:15px;line-height:1.6}
.sheet-bar{position:sticky;bottom:-20px;margin:0 -20px -20px;padding:14px 20px 20px;background:#fff;border-top:1px solid #DDE1E5;display:flex;gap:10px;align-items:center}
.sheet-bar.col{flex-direction:column;align-items:stretch}
.total{display:flex;justify-content:space-between;align-items:baseline;font-size:13px}
.total strong{font-size:18px;font-variant-numeric:tabular-nums}
.fine{font-size:12px;color:#5B6170;text-align:center}
.qty{height:48px;border:1px solid #C9CED4;border-radius:var(--r);background:#fff;display:flex;align-items:center}
.qty button{width:44px;height:46px;border:0;background:none;font-size:18px;cursor:pointer}
.qty span{min-width:20px;text-align:center;font-variant-numeric:tabular-nums}
.choose{border:0;margin:0;padding:0}
.choose legend{font-size:15px;font-weight:600;margin-bottom:10px;padding:0}
.cells{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:1px;background:#DDE1E5;border:1px solid #DDE1E5}
.cells label{background:#fff;min-height:64px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:4px;font-size:14px;font-weight:500;cursor:pointer;position:relative}
.cells label small{font-size:12.5px;font-weight:400;color:#3C4152}
.cells input{position:absolute;opacity:0;pointer-events:none}
.cells label:has(input:checked){box-shadow:inset 0 0 0 2px #13123A;font-weight:600}
.cells label:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:-4px}
.lines{list-style:none;margin:0;padding:0;display:grid;gap:1px;background:#DDE1E5;border:1px solid #DDE1E5}
.lines li{background:#fff;padding:12px 8px 12px 14px;display:grid;grid-template-columns:1fr auto;gap:2px 12px;align-items:center}
.lines .nm{font-size:15px;font-weight:600}
.lines .op{font-size:13px;color:#5B6170;grid-column:1}
.lines .rt{grid-row:1/span 2;grid-column:2;display:flex;flex-direction:column;align-items:flex-end}
.lines .rt .qty{height:36px;border:0;background:none}
.lines .rt .qty button{width:34px;height:34px;font-size:16px;color:#5B6170}
.fields{display:grid;gap:12px}
.fields label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500}
.fields input,.fields select{height:48px;padding:0 12px;border-radius:var(--r);border:1px solid #C9CED4;background:#fff;font:inherit;font-size:16px;color:#13123A}
.fields [data-address]{display:grid;gap:12px}
.fields [data-address][hidden]{display:none}
.err{margin:0;padding:10px 12px;background:#FDECEE;color:#8A1C2B;font-size:14px}
.err[hidden]{display:none}
.thanks{padding-top:48px;padding-bottom:40px;min-height:60vh}
.thanks h1{font-size:30px;line-height:1.12;max-width:20ch}
.thanks .actions{margin-top:32px}

@media (min-width:900px){
  .top-in{height:72px}
  .brand{flex:0 1 auto;font-size:20px}
  .nav{display:flex;flex:1}
  .hero{padding-top:80px}
  .hero h1{font-size:64px;line-height:1.03}
  .lede{font-size:18px}
  .how{margin-top:48px;gap:6px 40px;font-size:14px}
  .list{padding-top:72px}
  .list-head h2{font-size:32px}
  .grid{grid-template-columns:repeat(4,minmax(0,1fr))}
  .cell{min-height:176px}
  .cell-open{padding:20px 20px 0}
  .cell-foot{padding:6px 14px 8px 20px}
  .band{margin-top:96px}
  .band-in{grid-template-columns:5fr 6fr;gap:80px;padding-top:88px;padding-bottom:88px}
  .about .lead{font-size:34px;line-height:1.22}
  .quote{padding-top:0;border-top:0;align-self:end}
  .visit{grid-template-columns:5fr 6fr;gap:80px;padding-top:88px}
  .visit h2{font-size:32px}
  .contact{display:flex}
  .contact .btn{padding:0 18px}
  .foot{margin-top:88px;padding-bottom:40px}
  .sheet{margin:auto;border-radius:12px}
  .bagbar-in{max-width:560px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;
