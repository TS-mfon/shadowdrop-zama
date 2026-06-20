"use client";
import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ShieldCheck, Upload, LockKeyhole, Users, WalletCards, CheckCircle2, ExternalLink, ArrowRight, FileSpreadsheet } from "lucide-react";
import { getFheAirdropFactoryAddress, getFheDisperseSingletonAddress, getFheVestingFactoryAddress } from "@tokenops/sdk";

const flows = [
  ["Airdrop", "Signed private claims", "airdrop"], ["Vesting", "Cliffs and unlocks", "vesting"], ["Payroll", "Recurring contributor pay", "disperse"], ["Grants", "Private award batches", "disperse"],
  ["Referrals", "Hidden earned rewards", "disperse"], ["Team", "Confidential team schedules", "vesting"], ["Investors", "Private investor unlocks", "vesting"], ["Disperse", "One transaction, many recipients", "disperse"]
] as const;

export function ShadowApp() {
  const { address, isConnected, chainId } = useAccount(); const { connect, connectors } = useConnect(); const { disconnect } = useDisconnect(); const { switchChain } = useSwitchChain();
  const [selected, setSelected] = useState("Airdrop"); const [rows, setRows] = useState<{address:string; amount:string}[]>([]); const [name, setName] = useState("Genesis Community Drop");
  const addresses = useMemo(() => ({ airdrop: getFheAirdropFactoryAddress(sepolia.id), vesting: getFheVestingFactoryAddress(sepolia.id), disperse: getFheDisperseSingletonAddress(sepolia.id) }), []);
  const flow = flows.find(([label]) => label === selected)!;
  function readCsv(file?: File) { if (!file) return; const reader = new FileReader(); reader.onload = () => { const parsed = String(reader.result).split(/\r?\n/).slice(1).map(line => line.split(",")).filter(x => /^0x[a-fA-F0-9]{40}$/.test(x[0]?.trim()) && Number(x[1]) > 0).map(x => ({address:x[0].trim(), amount:x[1].trim()})); setRows(parsed); }; reader.readAsText(file); }
  const total = rows.reduce((n,r)=>n+Number(r.amount),0);
  return <main>
    <nav><div className="brand"><span className="mark"><LockKeyhole size={18}/></span>SHADOWDROP</div><div className="navmeta"><span className="network">● SEPOLIA</span>{isConnected ? <button className="wallet" onClick={()=>disconnect()}>{address?.slice(0,6)}…{address?.slice(-4)}</button> : <button className="wallet" onClick={()=>connect({connector:connectors[0]})}>Connect wallet</button>}</div></nav>
    <section className="hero"><div><div className="eyebrow">CONFIDENTIAL TOKEN OPERATIONS</div><h1>Distribute value.<br/><em>Reveal nothing.</em></h1><p>Institution-grade airdrops, vesting, payroll, grants and rewards powered by Zama FHE and TokenOps.</p><div className="proof"><span><ShieldCheck/> Encrypted onchain</span><span><Users/> Recipient-only access</span><span><WalletCards/> ERC-7984</span></div></div><div className="heroCard"><div className="pulse"/><small>PRIVATE DISTRIBUTION</small><strong>8 operational flows</strong><p>Amounts are encrypted before they leave this browser. ShadowDrop never receives plaintext allocations.</p><a href="#workspace">Open console <ArrowRight size={15}/></a></div></section>
    <section id="workspace" className="workspace"><aside><div className="asideTitle">OPERATIONS</div>{flows.map(([label,desc])=><button key={label} className={selected===label?"flow active":"flow"} onClick={()=>{setSelected(label);setRows([])}}><span>{label}</span><small>{desc}</small></button>)}</aside>
      <div className="console"><div className="consoleHead"><div><div className="eyebrow">NEW OPERATION / {selected.toUpperCase()}</div><h2>{selected} console</h2></div><span className="sdk">TOKENOPS SDK 1.0</span></div>
        {chainId && chainId!==sepolia.id && <button className="warning" onClick={()=>switchChain({chainId:sepolia.id})}>Switch to Ethereum Sepolia</button>}
        <div className="formGrid"><label>Campaign name<input value={name} onChange={e=>setName(e.target.value)} /></label><label>Execution contract<input readOnly value={addresses[flow[2]] || "Unavailable"}/></label></div>
        <div className="drop"><FileSpreadsheet size={28}/><strong>Import encrypted allocation batch</strong><p>CSV columns: address, amount. Validation and encryption happen locally.</p><label className="upload"><Upload size={15}/> Select CSV<input type="file" accept=".csv,text/csv" onChange={e=>readCsv(e.target.files?.[0])}/></label></div>
        <div className="summary"><div><small>VALID RECIPIENTS</small><strong>{rows.length}</strong></div><div><small>LOCAL TOTAL</small><strong>{total.toLocaleString()}</strong></div><div><small>PUBLIC AMOUNTS</small><strong className="safe">0</strong></div></div>
        {rows.length>0 && <div className="preview">{rows.slice(0,4).map((r,i)=><div key={r.address}><span>{String(i+1).padStart(2,"0")}</span><code>{r.address.slice(0,10)}…{r.address.slice(-6)}</code><b>••••••</b><CheckCircle2 size={16}/></div>)}</div>}
        <div className="actionRow"><div><b>Transaction lifecycle</b><small>Validate → encrypt → simulate → sign → confirm → ACL ready</small></div><button disabled={!isConnected||rows.length===0}>Encrypt & prepare <ArrowRight size={16}/></button></div>
      </div>
    </section>
    <section className="contracts"><div><div className="eyebrow">VERIFIABLE INFRASTRUCTURE</div><h2>Live TokenOps on Sepolia</h2></div>{Object.entries(addresses).map(([k,v])=><a key={k} href={`https://sepolia.etherscan.io/address/${v}`} target="_blank"><span>{k}</span><code>{v}</code><ExternalLink size={15}/></a>)}</section>
    <footer><div className="brand">SHADOWDROP</div><p>Privacy protects values, not wallet identity. Never upload sensitive plaintext data.</p><span>Built with Zama × TokenOps</span></footer>
  </main>;
}
