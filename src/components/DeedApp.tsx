'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ocrAadhaar, ocrPAN, todayAsDeedDate } from '../lib/ocr';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Partner {
  salutation: string; fullName: string; fatherName: string;
  age: string; address: string; panNumber: string;
  aadhaarNumberStored: boolean; panNumberStored: boolean;
  isManagingPartner: boolean; isBankAuthorized: boolean;
  capitalContribution: string; profitShare: string;
}

interface DeedData {
  executionDate: string; businessName: string; natureOfBusiness: string;
  durationType: string; durationStartDate: string; registeredAddress: string;
  partners: Partner[]; businessObjective: string;
}

type StepType =
  | 'num_partners' | 'deed_date'
  | 'partner_aadhaar' | 'partner_name' | 'partner_father'
  | 'partner_age' | 'partner_address' | 'partner_pan'
  | 'managing' | 'bank'
  | 'nature' | 'firm_name' | 'firm_address' | 'start_date'
  | 'capital' | 'profit' | 'generating' | 'done';

interface Step { type: StepType; partnerIdx?: number }

interface ChatMsg { role: 'bot' | 'user'; text: string; snapIdx?: number }
interface Snapshot { step: Step; data: DeedData; msgCount: number }

const PRIMARY = '#01334c';

const emptyPartner = (): Partner => ({
  salutation: 'Mr.', fullName: '', fatherName: '', age: '', address: '',
  panNumber: '', aadhaarNumberStored: false, panNumberStored: false,
  isManagingPartner: false, isBankAuthorized: false,
  capitalContribution: '', profitShare: '',
});

  // ─── Deed Preview ─────────────────────────────────────────────────────────────
 
function hl(val: string): React.CSSProperties {
  return val ? {} : { background: '#fff3cd', borderRadius: '2px', padding: '0 2px' };
}
function ph(val: string, label: string) { return val || `[${label}]`; }

const partyLabels = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth'];

function DeedPreview({ data: d, onUpdate, editable }: { data: DeedData; onUpdate?: (idx: number, field: string, value: string) => void; editable?: boolean; }) {
  const pg: React.CSSProperties = { fontFamily: 'Verdana, Geneva, sans-serif', fontSize: '10.5px', lineHeight: 1.75, color: '#000', padding: '56px 72px 72px 60px', background: '#fff' };
  const cl: React.CSSProperties = { display: 'flex', gap: '10px', marginBottom: '11px', alignItems: 'flex-start', textAlign: 'justify' };
  const b: React.CSSProperties = { fontWeight: 'bold' };
  const bu: React.CSSProperties = { fontWeight: 'bold', textDecoration: 'underline' };
  const ps = d.partners || [];
  const managers = ps.filter(p => p.isManagingPartner);
  const bankers = ps.filter(p => p.isBankAuthorized);

  return (
    <div style={pg}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px', marginBottom: '6px' }}>PARTNERSHIP DEED</div>
      <div style={{ height: '14px' }} />
      <div style={{ marginBottom: '12px', textAlign: 'justify' }}>
        This Deed of Partnership is made and executed on <span style={hl(d.executionDate)}>{ph(d.executionDate,'Deed Date')}</span>, by and between:
      </div>
      {ps.length === 0
        ? <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '10px' }}>[Partner details will appear as you answer the questions →]</div>
        : ps.map((p, i) => {
            if (!editable) {
              return (
                <div key={i}>
                  <div style={{ marginBottom: '6px', display: 'flex', gap: '10px' }}>
                    <span style={b}>{i + 1}.</span>
                    <span>
                      <span style={{ ...b, ...hl(p.fullName) }}>{ph(p.fullName,`Partner ${i+1}`)}</span> S/O{' '}
                      <span style={hl(p.fatherName)}>{ph(p.fatherName,"Father's Name")}</span> Aged{' '}
                      <span style={hl(p.age)}>{ph(p.age,'Age')}</span> Years, residing at{' '}
                      <span style={hl(p.address)}>{ph(p.address,'Address')}</span>.
                    </span>
                  </div>
                  <div style={{ paddingLeft: '220px', marginBottom: '14px' }}>
                    (Hereinafter called as the &ldquo;<span style={{ ...b, color: '#006666' }}>{partyLabels[i] || `${i+1}th`} party</span>&rdquo;)
                  </div>
                </div>
              );
            }
            // Editable mode: render inputs for core fields
            return (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={b}>{i + 1}.</span>
                  <span>
                    <input value={p.fullName} onChange={e => onUpdate?.(i, 'fullName', e.target.value)} style={Object.assign({},{ padding:'2px 6px', borderRadius: '4px', border: '1px solid #ccc' })} />
                    {' '}S/O{' '}
                    <input value={p.fatherName} onChange={e => onUpdate?.(i, 'fatherName', e.target.value)} style={{ padding:'2px 6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    {' '}Aged{' '}
                    <input value={p.age} onChange={e => onUpdate?.(i, 'age', e.target.value)} style={{ padding:'2px 6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    {' '}Years, residing at{' '}
                    <input value={p.address} onChange={e => onUpdate?.(i, 'address', e.target.value)} style={{ padding:'2px 6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </span>
                </div>
              </div>
            );
          })
      }
      <div style={{ marginBottom: '10px', textAlign: 'justify' }}>
        WHEREAS the parties have mutually decided to start a partnership business of{' '}
        <span style={hl(d.natureOfBusiness)}>{ph(d.natureOfBusiness,'Nature of Business')}</span> under the name and style as{' '}
        <span style={b}>M/s. <span style={hl(d.businessName)}>{ph(d.businessName,'Firm Name')}</span>.</span>
      </div>
      <div style={{ marginBottom: '14px', textAlign: 'justify' }}>AND WHEREAS it is felt expedient to reduce the terms and conditions into writing to avoid any misunderstandings.</div>
      <div style={{ textAlign: 'center', ...bu, marginBottom: '14px' }}>NOW THIS DEED OF PARTNERSHIP WITNESSETH AS FOLLOWS:</div>

      <div style={cl}><span style={{ minWidth: '26px' }}>1)</span><div style={{ flex: 1 }}>The partnership shall be carried on as <span style={b}>M/s. <span style={hl(d.businessName)}>{ph(d.businessName,'Firm Name')}</span></span> from <span style={{ ...b, ...hl(d.durationStartDate) }}>{ph(d.durationStartDate,'Start Date')}</span>. Duration: {d.durationType || 'AT WILL'} of the partners.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>2)</span><div style={{ flex: 1 }}>The <span style={b}>principal place of business</span> shall be at <span style={hl(d.registeredAddress)}>{ph(d.registeredAddress,'Registered Address')}</span>.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>3)</span><div style={{ flex: 1 }}>The <span style={b}>objective of partnership</span>: <span style={hl(d.businessObjective)}>{ph(d.businessObjective,'Business Objectives')}</span></div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>4)</span><div style={{ flex: 1 }}>
        <span style={b}>Capital Contribution:</span><br />
        {ps.length === 0 ? <span style={hl('')}>[Partner capital details]</span>
          : ps.map((p,i) => <span key={i}>&bull; <span style={hl(p.fullName)}>{ph(p.fullName,`P${i+1}`)}</span>: <span style={hl(p.capitalContribution)}>{ph(p.capitalContribution,'%')}</span>%<br /></span>)}
      </div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>5)</span><div style={{ flex: 1 }}>
        {managers.length > 0
          ? <>{managers.map((p,i) => <span key={i}><span style={{ ...b, ...hl(p.fullName) }}>{ph(p.fullName,`Manager`)}</span>{i < managers.length-1 ? ' & ' : ''}</span>)} shall be the <span style={b}>managing partner(s)</span> authorized to manage all business affairs, enter contracts, open bank accounts, and do all necessary acts for the firm.</>
          : <span style={hl('')}>[Managing partners — to be selected]</span>}
      </div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>6)</span><div style={{ flex: 1 }}>Banking accounts shall be operated by:{' '}{bankers.length > 0 ? bankers.map((p,i) => <span key={i}><span style={{ ...b, ...hl(p.fullName) }}>{ph(p.fullName,'Bank Partner')}</span>{i < bankers.length-1 ? ' and ' : ''}</span>) : <span style={hl('')}>[Bank authorized partners]</span>}.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>7)</span><div style={{ flex: 1 }}>Partners may appoint an authorized signatory for land/building transactions on mutual consent.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>8)</span><div style={{ flex: 1 }}>All partners shall be working partners. Salary/remuneration shall be as per Section 40(b) of the Income Tax Act, 1961. Interest at 12% per annum shall be payable on partners&apos; capital accounts.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>9)</span><div style={{ flex: 1 }}>Books of accounts shall be maintained at the principal place and closed on 31st March every year.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>10)</span><div style={{ flex: 1 }}>
        Profit/Loss shares:<br />
        {ps.length === 0 ? <span style={hl('')}>[Partner profit shares]</span>
          : ps.map((p,i) => <span key={i} style={b}>{i+1}. <span style={hl(p.fullName)}>{ph(p.fullName,`P${i+1}`)}</span> — <span style={hl(p.profitShare)}>{ph(p.profitShare,'%')}</span>%<br /></span>)}
      </div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>11)</span><div style={{ flex: 1 }}>Any partner may retire by giving three calendar months&apos; notice.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>12)</span><div style={{ flex: 1 }}>Death, retirement or insolvency of any partner shall not dissolve the partnership.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>13)</span><div style={{ flex: 1 }}>Disputes shall be referred to a mutually appointed arbitrator — <span style={b}>MUTATIS MUTANDIS</span>.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>14)</span><div style={{ flex: 1 }}>The Indian Partnership Act, 1932 applies except as otherwise stated.</div></div>
      <div style={cl}><span style={{ minWidth: '26px' }}>15)</span><div style={{ flex: 1 }}>Amendments shall be in writing on Rs. 100/- stamp paper and have equal effect.</div></div>

      <div style={{ marginTop: '20px', marginBottom: '30px', textAlign: 'justify' }}>
        IN WITNESS WHEREOF the parties have set their hands on this the <span style={{ ...b, ...hl(d.executionDate) }}>{ph(d.executionDate,'Deed Date')}</span>.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <div style={{ width: '44%' }}>
          <div style={bu}>WITNESSES</div>
          <div style={{ marginTop: '36px' }}>1. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '150px' }}>&nbsp;</span></div>
          <div style={{ marginTop: '38px' }}>2. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '150px' }}>&nbsp;</span></div>
        </div>
        <div style={{ width: '44%' }}>
          <div style={bu}>Partners</div>
          {ps.map((_,i) => <div key={i} style={{ marginTop: '36px' }}>{i+1}. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '140px' }}>&nbsp;</span></div>)}
          {ps.length === 0 && <div style={{ marginTop: '36px' }}><span style={hl('')}>[Partner signatures]</span></div>}
        </div>
      </div>
    </div>
  );
}

// ─── Main DeedApp ─────────────────────────────────────────────────────────────

export default function DeedApp() {
  const [data, setData] = useState<DeedData>({
    executionDate: todayAsDeedDate(), businessName: '', natureOfBusiness: '',
    durationType: 'AT WILL', durationStartDate: '', registeredAddress: '',
    partners: [], businessObjective: '',
  });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [step, setStep] = useState<Step>({ type: 'num_partners' });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrMode, setOcrMode] = useState<'AADHAAR' | 'PAN' | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Preview editing toggle and handler
  const [previewEditable, setPreviewEditable] = useState(false);
  const handlePreviewUpdate = (idx: number, field: string, value: string) => {
    setData(prev => {
      const pts = [...prev.partners];
      const p = pts[idx] ? { ...pts[idx] } : emptyPartner();
      (p as any)[field] = value;
      pts[idx] = p;
      return { ...prev, partners: pts };
    });
  };

  // Advance to next step given current step and number of partners
  const nextStep = useCallback((cur: Step, numPartners: number): Step => {
    const n = numPartners;
    const pi = cur.partnerIdx ?? 0;
    switch (cur.type) {
      case 'num_partners':   return { type: 'deed_date' };
      case 'deed_date':      return { type: 'partner_aadhaar', partnerIdx: 0 };
      case 'partner_aadhaar': return { type: 'partner_name', partnerIdx: pi };
      case 'partner_name':   return { type: 'partner_father', partnerIdx: pi };
      case 'partner_father': return { type: 'partner_age', partnerIdx: pi };
      case 'partner_age':    return { type: 'partner_address', partnerIdx: pi };
      case 'partner_address':return { type: 'partner_pan', partnerIdx: pi };
      case 'partner_pan':    return pi + 1 < n ? { type: 'partner_aadhaar', partnerIdx: pi + 1 } : { type: 'managing' };
      case 'managing':       return { type: 'bank' };
      case 'bank':           return { type: 'nature' };
      case 'nature':         return { type: 'firm_name' };
      case 'firm_name':      return { type: 'firm_address' };
      case 'firm_address':   return { type: 'start_date' };
      case 'start_date':     return { type: 'capital', partnerIdx: 0 };
      case 'capital':        return pi + 1 < n ? { type: 'capital', partnerIdx: pi + 1 } : { type: 'profit', partnerIdx: 0 };
      case 'profit':         return pi + 1 < n ? { type: 'profit', partnerIdx: pi + 1 } : { type: 'generating' };
      default: return { type: 'done' };
    }
  }, []);

  const questionFor = (s: Step, d: DeedData): string => {
    const pi = s.partnerIdx ?? 0;
    const pName = d.partners[pi]?.fullName ? `(${d.partners[pi].fullName})` : '';
    const partnerList = d.partners.map((p, i) => `${i + 1}. ${p.fullName || `Partner ${i + 1}`}`).join('\n');
    switch (s.type) {
      case 'num_partners':    return 'How many partners will be part of the firm? (2–50)';
      case 'deed_date':       return `Deed execution date is set to today: "${d.executionDate}"\nType a different date to change it, or press Enter / type "ok" to confirm.`;
      case 'partner_aadhaar': return `Upload Aadhaar card for Partner ${pi + 1} to auto-fill details, or type "skip" to enter manually.`;
      case 'partner_name':    return `Full name of Partner ${pi + 1}?`;
      case 'partner_father':  return `Father's / Spouse's name of Partner ${pi + 1} ${pName}?`;
      case 'partner_age':     return `Age of Partner ${pi + 1} ${pName} (in years)?`;
      case 'partner_address': return `Residential address of Partner ${pi + 1} ${pName}?`;
      case 'partner_pan':     return `Upload PAN card for Partner ${pi + 1} ${pName}, or type "skip".`;
      case 'managing':        return `Which partners are MANAGING partners?\nEnter comma-separated numbers:\n${partnerList}`;
      case 'bank':            return `Which partners are authorized to operate BANK ACCOUNTS?\nEnter comma-separated numbers:\n${partnerList}`;
      case 'nature':          return 'What is the nature of business?';
      case 'firm_name':       return nameSuggestions.length
        ? `Business/firm name?\nSuggestions:\n${nameSuggestions.map((n,i)=>`${i+1}. ${n}`).join('\n')}\n(Type a name or enter 1/2/3 to pick a suggestion)`
        : 'What is the business/firm name?';
      case 'firm_address':    return 'What is the registered address of the firm?';
      case 'start_date':      return 'What is the partnership start date? (e.g. 01st March 2026)';
      case 'capital':         return `Capital contribution % for Partner ${pi + 1} ${pName}?\n(Remaining partners will follow — all must total 100%)`;
      case 'profit':          return `Profit/loss share % for Partner ${pi + 1} ${pName}?\n(All must total 100%)`;
      case 'generating':      return '⏳ Generating your partnership deed…';
      case 'done':            return '✅ Your Partnership Deed is complete! Review on the right and click ⬇ Download Deed.';
      default: return '';
    }
  };

  useEffect(() => {
    const q = questionFor({ type: 'num_partners' }, data);
    setMessages([
      { role: 'bot', text: '⚖ Welcome! I\'ll guide you through drafting your Partnership Deed under the Indian Partnership Act, 1932.\n\nAadhaar/PAN upload auto-fills partner details. The deed updates live on the right.' },
      { role: 'bot', text: q },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const addBot = (text: string) => setMessages(prev => [...prev, { role: 'bot', text }]);

  const processAnswer = async (answer: string) => {
    const pi = step.partnerIdx ?? 0;
    const numPartners = data.partners.length;
    let newData = { ...data };

    const updatePartner = (idx: number, update: Partial<Partner>) => {
      const pts = [...newData.partners];
      pts[idx] = { ...pts[idx], ...update };
      newData = { ...newData, partners: pts };
    };

    switch (step.type) {
      case 'num_partners': {
        const n = Math.min(50, Math.max(2, parseInt(answer) || 2));
        newData.partners = Array.from({ length: n }, emptyPartner);
        break;
      }
      case 'deed_date': {
        if (answer.toLowerCase() !== 'ok' && answer.trim()) newData.executionDate = answer;
        break;
      }
      case 'partner_name':    updatePartner(pi, { fullName: answer }); break;
      case 'partner_father':  updatePartner(pi, { fatherName: answer }); break;
      case 'partner_age':     updatePartner(pi, { age: answer }); break;
      case 'partner_address': updatePartner(pi, { address: answer }); break;
      case 'managing': {
        const picks = answer.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < numPartners);
        const pts = newData.partners.map((p, i) => ({ ...p, isManagingPartner: picks.includes(i) }));
        newData = { ...newData, partners: pts };
        break;
      }
      case 'bank': {
        const picks = answer.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < numPartners);
        const pts = newData.partners.map((p, i) => ({ ...p, isBankAuthorized: picks.includes(i) }));
        newData = { ...newData, partners: pts };
        break;
      }
      case 'nature': {
        newData.natureOfBusiness = answer;
        // Fetch name suggestions in background
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: 'suggest_names', context: { natureOfBusiness: answer } }),
        }).then(r => r.json()).then(({ content }) => {
          try {
            const suggestions = JSON.parse(content);
            if (Array.isArray(suggestions)) setNameSuggestions(suggestions);
          } catch { /* ignore */ }
        }).catch(() => {});
        break;
      }
      case 'firm_name': {
        if (answer === '1' && nameSuggestions[0]) newData.businessName = nameSuggestions[0];
        else if (answer === '2' && nameSuggestions[1]) newData.businessName = nameSuggestions[1];
        else if (answer === '3' && nameSuggestions[2]) newData.businessName = nameSuggestions[2];
        else newData.businessName = answer;
        break;
      }
      case 'firm_address':  newData.registeredAddress = answer; break;
      case 'start_date':    newData.durationStartDate = answer; break;
      case 'capital':       updatePartner(pi, { capitalContribution: answer.replace('%','').trim() }); break;
      case 'profit':        updatePartner(pi, { profitShare: answer.replace('%','').trim() }); break;
    }

    setData(newData);

    const ns = nextStep(step, newData.partners.length);

    // Generate objectives before marking done
    if (ns.type === 'generating') {
      setStep(ns);
      addBot('⏳ Generating business objectives paragraph…');
      setLoading(true);
      try {
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: 'generate_objectives', context: { businessName: newData.businessName, natureOfBusiness: newData.natureOfBusiness } }),
        });
        const { content } = await r.json();
        newData = { ...newData, businessObjective: content };
        setData(newData);
      } catch { /* silent */ }
      setLoading(false);
      setStep({ type: 'done' });
      addBot('✅ Your Partnership Deed is complete! All fields are filled in.\nReview the document on the right and click ⬇ Download Deed.');
      return;
    }

    setStep(ns);
    // Show the next question (after a brief delay for nameSuggestions to load)
    setTimeout(() => {
      addBot(questionFor(ns, newData));
      if (ns.type === 'partner_aadhaar') setOcrMode('AADHAAR');
      else if (ns.type === 'partner_pan') setOcrMode('PAN');
      else setOcrMode(null);
    }, ns.type === 'firm_name' ? 800 : 0);
  };

  const handleEdit = (snapIdx: number) => {
    const snap = snapshots[snapIdx];
    if (!snap) return;
    // Restore step & data to before that answer was given
    setStep(snap.step);
    setData(snap.data);
    // Trim messages back to just before the user message
    setMessages(prev => prev.slice(0, snap.msgCount));
    // Trim snapshots to before this one
    setSnapshots(prev => prev.slice(0, snapIdx));
    // Pre-fill input with the old answer text
    const oldMsg = messages.find(m => m.snapIdx === snapIdx);
    setInput(oldMsg?.text || '');
    // Restore OCR mode if that step needed it
    if (snap.step.type === 'partner_aadhaar') setOcrMode('AADHAAR');
    else if (snap.step.type === 'partner_pan') setOcrMode('PAN');
    else setOcrMode(null);
  };

  const handleSend = async () => {
    const v = input.trim();
    if (!v || loading || step.type === 'done' || step.type === 'generating') return;
    setInput('');
    setOcrMode(null);
    // Save snapshot BEFORE processing so we can roll back later
    const snapIdx = snapshots.length;
    const snap: Snapshot = { step, data, msgCount: messages.length };
    setSnapshots(prev => [...prev, snap]);
    setMessages(prev => [...prev, { role: 'user', text: v, snapIdx }]);
    setLoading(true);
    await processAnswer(v);
    setLoading(false);
  };

  const handleOCRUpload = async (file: File, type: 'AADHAAR' | 'PAN') => {
    const pi = step.partnerIdx ?? 0;
    setOcrMode(null);
    setLoading(true);
    addBot(`🔍 Reading ${type === 'AADHAAR' ? 'Aadhaar' : 'PAN'} card…`);
    try {
      const extracted = type === 'AADHAAR' ? await ocrAadhaar(file) : await ocrPAN(file);
      const newData = { ...data };
      const pts = [...newData.partners];
      if (type === 'AADHAAR') {
        pts[pi] = {
          ...pts[pi],
          fullName: extracted.name || pts[pi].fullName,
          fatherName: extracted.fatherName || pts[pi].fatherName,
          age: extracted.age || pts[pi].age,
          address: extracted.address || pts[pi].address,
          aadhaarNumberStored: true,
        };
        addBot(`✅ Aadhaar extracted:\nName: ${extracted.name || '(not detected)'}\nFather: ${extracted.fatherName || '(not detected)'}\nAge: ${extracted.age || '(not detected)'}\nAddress: ${extracted.address || '(not detected)'}\n\nPlease type the full name of Partner ${pi + 1} (or confirm by typing "ok")`);
      } else {
        pts[pi] = {
          ...pts[pi],
          panNumber: extracted.pan || pts[pi].panNumber,
          fullName: extracted.name && !pts[pi].fullName ? extracted.name : pts[pi].fullName,
          panNumberStored: !!extracted.pan,
        };
        addBot(`✅ PAN extracted: ${extracted.pan || '(not detected)'}`);
      }
      newData.partners = pts;
      setData(newData);
      // Advance past the upload step
      const ns = nextStep(step, newData.partners.length);
      setStep(ns);
      setTimeout(() => addBot(questionFor(ns, newData)), 300);
    } catch {
      addBot('❌ Could not read the image. Please try a clearer photo or type the details manually.');
      const ns = nextStep(step, data.partners.length);
      setStep(ns);
      setTimeout(() => addBot(questionFor(ns, data)), 300);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Live iframe preview state ──
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const refreshPreview = useCallback(async (d: DeedData) => {
    if (d.partners.length === 0) return;
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/render-deed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deedData: d }),
      });
      const { html } = await res.json();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setIframeUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch { /* silent */ }
    setPreviewLoading(false);
  }, []);

  // Refresh preview whenever deed data changes
  useEffect(() => { refreshPreview(data); }, [data, refreshPreview]);

  const handleDownloadPDF = async () => {
    const res = await fetch('/api/download-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deedData: data }),
    });
    if (!res.ok) { alert('PDF generation failed. Please try again.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Deed_${(data.businessName || 'Firm').replace(/\s+/g,'_')}.pdf`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleDownloadDOCX = async () => {
    const res = await fetch('/api/download-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deedData: data }),
    });
    if (!res.ok) { alert('DOCX generation failed. Please try again.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Deed_${(data.businessName || 'Firm').replace(/\s+/g,'_')}.docx`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Progress

  const stepOrder: StepType[] = ['num_partners','deed_date','partner_aadhaar','partner_name','partner_father','partner_age','partner_address','partner_pan','managing','bank','nature','firm_name','firm_address','start_date','capital','profit','generating','done'];
  const progressIdx = stepOrder.indexOf(step.type);
  const progress = step.type === 'done' ? 100 : Math.round((progressIdx / stepOrder.length) * 100);

  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#e5e5e5' }}>

      {/* ── LEFT CHAT PANEL ── */}
      <div style={{ width: '380px', minWidth: '380px', display: 'flex', flexDirection: 'column', background: '#1a1a2e', color: '#fff', boxShadow: '4px 0 24px rgba(0,0,0,0.35)' }}>
        {/* Header */}
        <div style={{ padding: '18px 18px 14px', background: '#12122a', borderBottom: '1px solid #0f3460' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#d4a843', letterSpacing: '0.6px', marginBottom: '2px' }}>⚖ AI Partnership Deed Assistant</div>
          <div style={{ fontSize: '10.5px', color: '#7a8494', marginBottom: '11px' }}>Indian Partnership Act, 1932</div>
          <div style={{ background: '#0a2040', borderRadius: '3px', height: '4px' }}>
            <div style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#c9932a,#f0c060)', height: '100%', borderRadius: '3px', transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ fontSize: '10px', color: '#7a8494' }}>
              {data.partners.length > 0 ? `${data.partners.length} partner(s)` : 'Getting started…'}
            </span>
            <span style={{ fontSize: '10px', color: '#d4a843', fontWeight: 600 }}>{progress}%</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '7px' }}>
              {msg.role === 'bot' && (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#d4a843', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>⚖</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '3px', maxWidth: '85%' }}>
                <div style={{
                  padding: '9px 12px',
                  borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: msg.role === 'user' ? '#d4a843' : '#1e2545',
                  color: msg.role === 'user' ? '#12122a' : '#c8d0df',
                  fontSize: '11.5px', lineHeight: 1.6,
                  fontWeight: msg.role === 'user' ? 700 : 'normal' as any,
                  border: msg.role === 'bot' ? '1px solid #2a3560' : 'none',
                  whiteSpace: 'pre-wrap',
                }}>{msg.text}</div>
                {msg.role === 'user' && msg.snapIdx !== undefined && !loading && step.type !== 'done' && (
                  <button
                    onClick={() => handleEdit(msg.snapIdx!)}
                    title="Edit this answer"
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: '#4a5572', fontSize: '10px', padding: '1px 4px',
                      display: 'flex', alignItems: 'center', gap: '3px',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#d4a843')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#4a5572')}
                  >
                    ✏️ <span style={{ fontSize: '9.5px' }}>Edit</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#d4a843', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>⚖</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d4a843', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {step.type !== 'done' && step.type !== 'generating' && (
          <div style={{ padding: '12px', background: '#12122a', borderTop: '1px solid #1a2a4a' }}>
            {/* OCR Upload Card */}
            {ocrMode && (
              <div style={{ background: '#0f1f3a', border: `1.5px dashed rgba(212,168,67,0.4)`, borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#d4a843', fontWeight: 700, marginBottom: '8px' }}>
                  {ocrMode === 'AADHAAR' ? '🪪 Aadhaar Card' : '📋 PAN Card'} — Upload image to auto-fill
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf,.heic,.heif,.tiff,.tif" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleOCRUpload(f, ocrMode!); }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: '#d4a843', color: '#12122a', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    📤 Choose Image
                  </button>
                  <button onClick={() => { setOcrMode(null); setMessages(prev => [...prev, { role: 'user', text: 'skip' }]); processAnswer('skip'); }}
                    style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid #2a3560', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
                    Skip
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Type your answer…" rows={2}
                style={{ flex: 1, background: '#0f1f3a', border: '1px solid #2a3560', borderRadius: '10px', padding: '9px 13px', fontSize: '11.5px', color: '#d4c090', outline: 'none', resize: 'none', lineHeight: 1.5, fontFamily: 'inherit' }} />
              <button onClick={handleSend} disabled={loading || !input.trim()}
                style={{ background: loading || !input.trim() ? '#333' : '#d4a843', color: '#12122a', border: 'none', borderRadius: '10px', width: '42px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: '17px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
            </div>
            <div style={{ fontSize: '9.5px', color: '#4a5572', marginTop: '4px' }}>Enter to submit • Shift+Enter for new line</div>
          </div>
        )}
        {step.type === 'done' && (
          <div style={{ padding: '16px', background: '#12122a', borderTop: '1px solid #1a2a4a', textAlign: 'center' }}>
            <div style={{ color: '#d4a843', fontSize: '13px', fontWeight: 700 }}>🎉 Deed Complete!</div>
            <div style={{ color: '#7a8494', fontSize: '11px', marginTop: '4px' }}>Download it from the right panel</div>
          </div>
        )}
      </div>

      {/* ── RIGHT PREVIEW PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a2e' }}>📄 Live Document Preview</span>
            {previewLoading && <span style={{ fontSize: '10px', color: '#888', background: '#f5f5f5', padding: '2px 10px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>Refreshing…</span>}
            {!previewLoading && data.partners.length > 0 && (
              <span style={{ fontSize: '10px', color: PRIMARY, background: 'rgba(1,51,76,0.08)', padding: '2px 10px', borderRadius: '10px', fontWeight: 600 }}>
                {data.partners.length} Partner{data.partners.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleDownloadPDF} disabled={!iframeUrl}
              style={{ background: iframeUrl ? '#b91c1c' : '#ccc', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 14px', cursor: iframeUrl ? 'pointer' : 'not-allowed', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.4px' }}>
              📄 PDF
            </button>
            <button onClick={handleDownloadDOCX} disabled={!iframeUrl}
              style={{ background: iframeUrl ? '#1d4ed8' : '#ccc', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 14px', cursor: iframeUrl ? 'pointer' : 'not-allowed', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.4px' }}>
              📝 DOCX
            </button>
          </div>
        </div>
        {/* iframe preview */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#ccc', display: 'flex', alignItems: 'stretch' }}>
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              style={{ flex: 1, border: 'none', background: '#fff' }}
              title="Partnership Deed Preview"
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '13px' }}>
              Your deed will appear here as you answer the questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
