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
  const [messages, setMessages] = useState<{ role: 'user'|'bot'|'system', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

  const addBot = (text: string) => setMessages(prev => [...prev, { role: 'bot', text }]);

  const processChat = async (userText: string, hiddenSystemContext?: string) => {
    let currentMsgs = [...messages];
    if (userText) {
      currentMsgs.push({ role: 'user', text: userText });
      setMessages(currentMsgs);
    }
    
    setLoading(true);
    try {
      const apiMessages = currentMsgs.map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.text }));
      if (hiddenSystemContext) {
        apiMessages.push({ role: 'system', content: hiddenSystemContext });
      }

      const r = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, deedData: data }),
      });
      const res = await r.json();

      if (res.extractedData) {
         let newData = { ...data, ...res.extractedData };
         if (res.extractedData.partners) {
             const mergedPartners = [...data.partners];
             res.extractedData.partners.forEach((pUpdate: any, i: number) => {
                 mergedPartners[i] = { ...(mergedPartners[i] || emptyPartner()), ...pUpdate };
             });
             newData.partners = mergedPartners;
         }
         setData(newData);
      }

      if (res.content) {
         currentMsgs.push({ role: 'bot', text: res.content });
         setMessages(currentMsgs);
      }
    } catch {
      addBot("Sorry, I encountered an error connecting to the AI.");
    }
    setLoading(false);
  };

  useEffect(() => {
    setMessages([
      { role: 'bot', text: '⚖ Welcome! I am your AI assistant to help you draft your Partnership Deed.\nI will ask you for details one by one. You can upload ID cards or type the info manually.' }
    ]);
    processChat('', 'The user has just arrived. Please greet them briefly and ask for the number of partners or the business name.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const v = input.trim();
    if (!v || loading) return;
    setInput('');
    await processChat(v);
  };

  const handleOCRUpload = async (file: File, type: 'AADHAAR' | 'PAN') => {
    setLoading(true);
    addBot(`🔍 Reading ${type === 'AADHAAR' ? 'Aadhaar' : 'PAN'} card via OCR...`);
    try {
      const extracted = type === 'AADHAAR' ? await ocrAadhaar(file) : await ocrPAN(file);
      const details = type === 'AADHAAR' 
        ? `Name: ${extracted.name}, Father: ${extracted.fatherName}, Age: ${extracted.age}, Address: ${extracted.address}`
        : `PAN: ${extracted.pan}`;
      
      const hiddenContext = `The user just uploaded an ${type} card. The OCR system extracted these details: ${details}. Acknowledge this and seamlessly update the data using the tool, then ask for the next missing field.`;
      
      await processChat(`[Uploaded ${type} Card Image]`, hiddenContext);
    } catch {
      addBot('❌ Could not read the image. Please type the details manually.');
      setLoading(false);
    }
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
  const requiredCount = [data.businessName, data.natureOfBusiness, data.durationStartDate, data.registeredAddress].filter(f => !!f).length + (data.partners.length * 2);
  const totalRequired = 4 + (Math.max(2, data.partners.length) * 2);
  const progress = Math.min(100, Math.round((requiredCount / totalRequired) * 100));

  const fileRef = useRef<HTMLInputElement>(null);
  const [activeUploadContext, setActiveUploadContext] = useState<'AADHAAR' | 'PAN'>('AADHAAR');

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
        <div style={{ padding: '12px', background: '#12122a', borderTop: '1px solid #1a2a4a' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={() => { setActiveUploadContext('AADHAAR'); fileRef.current?.click(); }}
              style={{ flex: 1, padding: '7px', borderRadius: '7px', border: '1px solid #2a3560', background: 'transparent', color: '#94a3b8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
              📎 Upload Aadhaar
            </button>
            <button onClick={() => { setActiveUploadContext('PAN'); fileRef.current?.click(); }}
              style={{ flex: 1, padding: '7px', borderRadius: '7px', border: '1px solid #2a3560', background: 'transparent', color: '#94a3b8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
              📎 Upload PAN
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf,.heic,.heif,.tiff,.tif" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleOCRUpload(f, activeUploadContext); }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Type your answer…" rows={2}
              style={{ flex: 1, background: '#0f1f3a', border: '1px solid #2a3560', borderRadius: '10px', padding: '9px 13px', fontSize: '11.5px', color: '#d4c090', outline: 'none', resize: 'none', lineHeight: 1.5, fontFamily: 'inherit' }} />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              style={{ background: loading || !input.trim() ? '#333' : '#d4a843', color: '#12122a', border: 'none', borderRadius: '10px', width: '42px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: '17px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
          </div>
          <div style={{ fontSize: '9.5px', color: '#4a5572', marginTop: '4px' }}>Enter to submit • Shift+Enter for new line</div>
        </div>
        {progress >= 100 && (
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
