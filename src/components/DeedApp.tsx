'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ocrAadhaar, ocrPAN, todayAsDeedDate } from '../../lib/ocr';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Partner {
  salutation: string; fullName: string; fatherName: string;
  age: string; address: string; panNumber: string;
  aadhaarNumberStored: boolean; panNumberStored: boolean;
  isManagingPartner: boolean; isBankAuthorized: boolean;
  capitalContribution: string; profitShare: string;
}

interface DeedData {
  numPartners?: number;
  executionDate: string; businessName: string; natureOfBusiness: string;
  durationType: string; durationStartDate: string; registeredAddress: string;
  partners: Partner[]; businessObjective: string;
}

const emptyPartner = (): Partner => ({
  salutation: 'Mr.', fullName: '', fatherName: '', age: '', address: '',
  panNumber: '', aadhaarNumberStored: false, panNumberStored: false,
  isManagingPartner: false, isBankAuthorized: false,
  capitalContribution: '', profitShare: '',
});

// ─── Constants & Styles ────────────────────────────────────────────────────────

const PRIMARY = '#0f172a';      // Slate 900
const ACCENT = '#3b82f6';       // Blue 500
const ACCENT_GLOW = 'rgba(59, 130, 246, 0.5)';
const BG_DARK = '#020617';      // Slate 950
const PANEL_BG = '#0f172a';     // Slate 900
const TEXT_MUTED = '#94a3b8';   // Slate 400
const TEXT_LIGHT = '#f8fafc';   // Slate 50

// ─── Deed Preview ─────────────────────────────────────────────────────────────

function hl(val: string): React.CSSProperties {
  return val ? {} : { background: '#fef9c3', color: '#854d0e', borderRadius: '4px', padding: '0 4px', fontWeight: 600, border: '1px dashed #eab308' };
}
function ph(val: string, label: string) { return val || `[${label}]`; }

const partyLabels = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

function DeedPreview({ data: d }: { data: DeedData }) {
  const pg: React.CSSProperties = { fontFamily: '"Georgia", serif', fontSize: '13px', lineHeight: 1.8, color: '#1e293b', padding: '60px 80px', background: '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' };
  const cl: React.CSSProperties = { display: 'flex', gap: '14px', marginBottom: '14px', alignItems: 'flex-start', textAlign: 'justify' };
  const b: React.CSSProperties = { fontWeight: 'bold', color: '#0f172a' };
  const bu: React.CSSProperties = { fontWeight: 'bold', textDecoration: 'underline', color: '#0f172a' };
  const ps = d.partners || [];
  const managers = ps.filter(p => p.isManagingPartner);
  const bankers = ps.filter(p => p.isBankAuthorized);

  return (
    <div style={pg}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>Partnership Deed</div>
      <div style={{ height: '20px' }} />
      <div style={{ marginBottom: '16px', textAlign: 'justify' }}>
        This Deed of Partnership is made and executed on <span style={hl(d.executionDate)}>{ph(d.executionDate, 'Deed Date')}</span>, by and between:
      </div>
      {ps.length === 0
        ? <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', borderLeft: `4px solid ${ACCENT}`, color: '#475569' }}>
          ✨ Your partner details will dynamically appear here as we chat.
        </div>
        : ps.map((p, i) => (
          <div key={i} style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', display: 'flex', gap: '12px' }}>
              <span style={b}>{i + 1}.</span>
              <span>
                <span style={{ ...b, ...hl(p.fullName) }}>{ph(p.fullName, `Partner ${i + 1}`)}</span> S/O{' '}
                <span style={hl(p.fatherName)}>{ph(p.fatherName, "Father's Name")}</span> Aged{' '}
                <span style={hl(p.age)}>{ph(p.age, 'Age')}</span> Years, residing at{' '}
                <span style={hl(p.address)}>{ph(p.address, 'Address')}</span>.
              </span>
            </div>
            <div style={{ paddingLeft: '40px', marginBottom: '16px', fontStyle: 'italic', color: '#334155' }}>
              (Hereinafter called as the &ldquo;<span style={{ ...b, color: ACCENT }}>{partyLabels[i] || `${i + 1}th`} party</span>&rdquo;)
            </div>
          </div>
        ))
      }
      <div style={{ marginBottom: '14px', textAlign: 'justify' }}>
        WHEREAS the parties have mutually decided to start a partnership business of{' '}
        <span style={hl(d.natureOfBusiness)}>{ph(d.natureOfBusiness, 'Nature of Business')}</span> under the name and style as{' '}
        <span style={{ ...b, fontSize: '14px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>M/s. <span style={hl(d.businessName)}>{ph(d.businessName, 'Firm Name')}</span>.</span>
      </div>
      <div style={{ marginBottom: '20px', textAlign: 'justify' }}>AND WHEREAS it is felt expedient to reduce the terms and conditions into writing to avoid any misunderstandings.</div>
      <div style={{ textAlign: 'center', ...bu, marginBottom: '20px', fontSize: '14px' }}>NOW THIS DEED OF PARTNERSHIP WITNESSETH AS FOLLOWS:</div>

      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>1)</span><div style={{ flex: 1 }}>The partnership shall be carried on as <span style={b}>M/s. <span style={hl(d.businessName)}>{ph(d.businessName, 'Firm Name')}</span></span> from <span style={{ ...b, ...hl(d.durationStartDate) }}>{ph(d.durationStartDate, 'Start Date')}</span>. Duration: {d.durationType || 'AT WILL'} of the partners.</div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>2)</span><div style={{ flex: 1 }}>The <span style={b}>principal place of business</span> shall be at <span style={hl(d.registeredAddress)}>{ph(d.registeredAddress, 'Registered Address')}</span>.</div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>3)</span><div style={{ flex: 1 }}>The <span style={b}>objective of partnership</span>: <span style={hl(d.businessObjective)}>{ph(d.businessObjective, 'Business Objectives')}</span></div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>4)</span><div style={{ flex: 1 }}>
        <span style={b}>Capital Contribution:</span><br />
        {ps.length === 0 ? <span style={hl('')}>[Partner capital details]</span>
          : ps.map((p, i) => <span key={i}>&bull; <span style={{ ...b, ...hl(p.fullName) }}>{ph(p.fullName, `P${i + 1}`)}</span>: <span style={hl(p.capitalContribution)}>{ph(p.capitalContribution, '%')}</span>%<br /></span>)}
      </div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>5)</span><div style={{ flex: 1 }}>
        {managers.length > 0
          ? <>{managers.map((p, i) => <span key={i}><span style={{ ...b, ...hl(p.fullName), color: ACCENT }}>{ph(p.fullName, `Manager`)}</span>{i < managers.length - 1 ? ' & ' : ''}</span>)} shall be the <span style={b}>managing partner(s)</span> authorized to manage all business affairs.</>
          : <span style={hl('')}>[Managing partners to be selected]</span>}
      </div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>6)</span><div style={{ flex: 1 }}>Banking accounts shall be operated by:{' '}{bankers.length > 0 ? bankers.map((p, i) => <span key={i}><span style={{ ...b, ...hl(p.fullName), color: ACCENT }}>{ph(p.fullName, 'Bank Partner')}</span>{i < bankers.length - 1 ? ' and ' : ''}</span>) : <span style={hl('')}>[Bank authorized partners]</span>}.</div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>7)</span><div style={{ flex: 1 }}>Profit/Loss shares:<br />
        {ps.length === 0 ? <span style={hl('')}>[Partner profit shares]</span>
          : ps.map((p, i) => <span key={i} style={b}>{i + 1}. <span style={hl(p.fullName)}>{ph(p.fullName, `P${i + 1}`)}</span> — <span style={hl(p.profitShare)}>{ph(p.profitShare, '%')}</span>%<br /></span>)}
      </div></div>

      <div style={{ marginTop: '40px', marginBottom: '40px', textAlign: 'justify' }}>
        IN WITNESS WHEREOF the parties have set their hands on this the <span style={{ ...b, ...hl(d.executionDate) }}>{ph(d.executionDate, 'Deed Date')}</span>.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <div style={{ width: '44%' }}>
          <div style={bu}>WITNESSES</div>
          <div style={{ marginTop: '40px' }}>1. <span style={{ borderBottom: '1px solid #cbd5e1', display: 'inline-block', width: '150px' }}>&nbsp;</span></div>
          <div style={{ marginTop: '40px' }}>2. <span style={{ borderBottom: '1px solid #cbd5e1', display: 'inline-block', width: '150px' }}>&nbsp;</span></div>
        </div>
        <div style={{ width: '44%' }}>
          <div style={bu}>PARTNERS</div>
          {ps.map((_, i) => <div key={i} style={{ marginTop: '40px' }}>{i + 1}. <span style={{ borderBottom: '1px solid #cbd5e1', display: 'inline-block', width: '140px' }}>&nbsp;</span></div>)}
          {ps.length === 0 && <div style={{ marginTop: '40px' }}><span style={hl('')}>[Partner signatures]</span></div>}
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
  const [messages, setMessages] = useState<{ role: 'user' | 'bot' | 'system', text: string }[]>([]);
  // Use a ref so processChat always reads the LATEST messages without stale closure
  const messagesRef = useRef<{ role: 'user' | 'bot' | 'system', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);

  const addBot = (text: string) => {
    const next = [...messagesRef.current, { role: 'bot' as const, text }];
    messagesRef.current = next;
    setMessages(next);
  };

  const processChat = async (userText: string, hiddenSystemContext?: string) => {
    // Always read from ref to avoid stale closure
    let currentMsgs = [...messagesRef.current];
    if (userText) {
      const userMsg = { role: 'user' as const, text: userText };
      currentMsgs = [...currentMsgs, userMsg];
      messagesRef.current = currentMsgs;
      setMessages(currentMsgs);
    }

    setLoading(true);
    try {
      // Map to API format. System context is appended as a user message so Gemini
      // treats it as part of the latest turn (Gemini has no system role).
      const apiMessages = currentMsgs.map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.text }));
      if (hiddenSystemContext) {
        apiMessages.push({ role: 'user', content: `[CONTEXT for AI only – do not repeat to user]: ${hiddenSystemContext}` });
      }

      const r = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, deedData: data }),
      });
      const res = await r.json();

      if (res.extractedData) {
        let newData = { ...data, ...res.extractedData };

        if (res.extractedData.numPartners && newData.partners.length !== (typeof res.extractedData.numPartners === 'string' ? parseInt(res.extractedData.numPartners) : res.extractedData.numPartners)) {
          const num = typeof res.extractedData.numPartners === 'string' ? parseInt(res.extractedData.numPartners) : res.extractedData.numPartners;
          newData.partners = Array.from({ length: num }, emptyPartner);
        }

        // Handle partner index shortcut injection
        if (res.extractedData.partnerIndex !== undefined) {
          const i = res.extractedData.partnerIndex;
          const mergedPartners = [...newData.partners];
          const p = mergedPartners[i] || emptyPartner();
          if (res.extractedData.fullName !== undefined) p.fullName = res.extractedData.fullName;
          if (res.extractedData.fatherName !== undefined) p.fatherName = res.extractedData.fatherName;
          if (res.extractedData.age !== undefined) p.age = res.extractedData.age;
          if (res.extractedData.address !== undefined) p.address = res.extractedData.address;
          if (res.extractedData.panNumber !== undefined) p.panNumber = res.extractedData.panNumber;
          if (res.extractedData.capitalContribution !== undefined) p.capitalContribution = res.extractedData.capitalContribution;
          if (res.extractedData.profitShare !== undefined) p.profitShare = res.extractedData.profitShare;
          if (res.extractedData.isManagingPartner !== undefined) p.isManagingPartner = res.extractedData.isManagingPartner;
          if (res.extractedData.isBankAuthorized !== undefined) p.isBankAuthorized = res.extractedData.isBankAuthorized;
          mergedPartners[i] = p;
          newData.partners = mergedPartners;
        }

        if (res.extractedData.partners) {
          const mergedPartners = [...newData.partners];
          res.extractedData.partners.forEach((pUpdate: any, i: number) => {
            mergedPartners[i] = { ...(mergedPartners[i] || emptyPartner()), ...pUpdate };
          });
          newData.partners = mergedPartners;
        }

        setData(newData);
        
        // Auto-generate business objectives ONCE (no recursive processChat call - that caused infinite loop)
        if (newData.businessName && newData.natureOfBusiness && !newData.businessObjective && res.missingFields?.includes("Drafting the Business Objectives (AI can generate this automatically)")) {
          try {
             const genMsg = { role: 'bot' as const, text: '✨ Generating Business Objectives automatically for your firm...' };
             currentMsgs = [...currentMsgs, genMsg];
             messagesRef.current = currentMsgs;
             setMessages(currentMsgs);
             
             const objRes = await fetch('/api/chat', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ task: 'generate_objectives', context: { businessName: newData.businessName, natureOfBusiness: newData.natureOfBusiness }})
             });
             const objData = await objRes.json();
             if (objData.content) {
                newData = { ...newData, businessObjective: objData.content };
                setData(newData);
                // Just add a confirmation bot message - do NOT call processChat again
                const doneMsg = { role: 'bot' as const, text: `✅ Business Objectives drafted and saved! Moving on to the next step.` };
                currentMsgs = [...currentMsgs, doneMsg];
                messagesRef.current = currentMsgs;
                setMessages(currentMsgs);
             }
          } catch(e) { console.error('Objectives generation failed', e); }
        }
      }

      if (res.missingFields) {
        // Calculate dynamic progress
        const missingCount = res.missingFields.length;
        // Base fields ~6 + (partners * 7)
        const baseExpected = 7 + (data.numPartners || 2) * 7;
        const calcProgress = Math.max(5, Math.min(100, Math.round(((baseExpected - missingCount) / baseExpected) * 100)));
        setProgress(calcProgress);
        if (missingCount === 0) setIsComplete(true);
      }

      if (res.content) {
        currentMsgs = [...currentMsgs, { role: 'bot' as const, text: res.content }];
        messagesRef.current = currentMsgs;
        setMessages(currentMsgs);
      }
    } catch {
      addBot("Sorry, I encountered an error connecting to the AI.");
    }
    setLoading(false);
  };

  useEffect(() => {
    // Set the initial greeting directly - no API call needed for it
    const welcomeMsg = { role: 'bot' as const, text: '✨ Welcome to OnEasy Legal!\n\nI am your AI legal assistant. I will craft a perfect Partnership Deed for you by simply asking a few conversational questions.\n\nHow many partners will be in this firm? (Usually 2 or more)' };
    messagesRef.current = [welcomeMsg];
    setMessages([welcomeMsg]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const v = input.trim();
    if (!v || loading) return;
    setInput('');
    await processChat(v);
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [activeUploadContext, setActiveUploadContext] = useState<'AADHAAR' | 'PAN'>('AADHAAR');

  const handleOCRUpload = async (file: File, type: 'AADHAAR' | 'PAN') => {
    setLoading(true);
    setOcrStatus('🔒 Encrypting document...');

    // Progressive psychological loading state
    const t1 = setTimeout(() => setOcrStatus('🔍 Analyzing securely with Gemini AI...'), 1200);
    const t2 = setTimeout(() => setOcrStatus('📝 Extracting details...'), 2600);

    try {
      const extracted = type === 'AADHAAR' ? await ocrAadhaar(file) : await ocrPAN(file);
      clearTimeout(t1); clearTimeout(t2);
      setOcrStatus(null);

      const details = type === 'AADHAAR'
        ? `Name: ${extracted.name}, Father: ${extracted.fatherName}, Age: ${extracted.age}, Address: ${extracted.address}`
        : `Name: ${extracted.name}, PAN: ${extracted.pan}, DOB: ${extracted.dob}`;

      const hiddenContext = `The user uploaded an ${type} card. Gemini 2.0 Flash Lite extracted: ${details}. Praise the user for saving time with OCR, seamlessly update the data using the tool, and proceed to ask for the next missing field in the list.`;

      await processChat(`[Uploaded ${type} Securely]`, hiddenContext);
    } catch (err: any) {
      clearTimeout(t1); clearTimeout(t2);
      setOcrStatus(null);
      addBot(`❌ Gemini AI could not read the image perfectly (${err?.message || 'Blurry or unreadable'}). Could you please try another photo or type the details instead?`);
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

  useEffect(() => { refreshPreview(data); }, [data, refreshPreview]);

  const saveToDatabase = async () => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      };
      const token = getCookie('sb-access-token');
      await fetch('/api/render-deed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ deedData: data, saveToDb: true }),
      });
    } catch { /* silent */ }
  };

  const handleDownloadPDF = async () => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      // Background save to DB
      await saveToDatabase();
      // Trigger the browser's highly-optimized native PDF generator
      iframe.contentWindow.print();
    } else {
      alert('Preview is still loading...');
    }
  };

  const handleDownloadDOCX = async () => {
    // Background save to DB
    await saveToDatabase();
    
    const res = await fetch('/api/download-docx', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deedData: data }),
    });
    if (!res.ok) { alert('DOCX generation failed.'); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = `Partnership_Deed.docx`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc' }}>

      {/* ── LEFT CHAT PANEL ── */}
      <div className="chat-panel" style={{ width: '420px', minWidth: '420px', display: 'flex', flexDirection: 'column', background: BG_DARK, color: TEXT_LIGHT, boxShadow: '8px 0 30px rgba(0,0,0,0.15)', zIndex: 10 }}>
        {/* Header */}
        <div style={{ padding: '24px 20px 20px', background: PANEL_BG, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${ACCENT}, #2563eb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: `0 4px 12px ${ACCENT_GLOW}` }}>⚖️</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}>Deed AI Assistant</div>
              <div style={{ fontSize: '12px', color: TEXT_MUTED }}>Dynamic Legal Drafting</div>
            </div>
          </div>

          <div style={{ background: '#1e293b', borderRadius: '8px', height: '6px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{ width: `${progress}%`, background: `linear-gradient(90deg, #3b82f6, #60a5fa)`, height: '100%', borderRadius: '8px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 10px ${ACCENT_GLOW}` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: TEXT_MUTED, fontWeight: 500 }}>
            <span>{isComplete ? 'All Requirements Met ✨' : 'Drafting in progress...'}</span>
            <span style={{ color: ACCENT, fontWeight: 700 }}>{progress}%</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', scrollBehavior: 'smooth' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '10px', animation: 'fadeIn 0.3s ease-out' }}>
              {msg.role === 'bot' && (
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `linear-gradient(135deg, #1e293b, #334155)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>🤖</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px', maxWidth: '85%' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? `linear-gradient(135deg, ${ACCENT}, #2563eb)` : '#1e293b',
                  color: msg.role === 'user' ? '#ffffff' : '#f8fafc',
                  fontSize: '13.5px', lineHeight: 1.6,
                  fontWeight: 400,
                  boxShadow: msg.role === 'user' ? `0 4px 14px ${ACCENT_GLOW}` : '0 4px 14px rgba(0,0,0,0.1)',
                  whiteSpace: 'pre-wrap',
                }}>{msg.text}</div>
              </div>
            </div>
          ))}
          {ocrStatus && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '10px', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `linear-gradient(135deg, #1e293b, #334155)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>🤖</div>
              <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: '#1e293b', color: '#f8fafc', fontSize: '13.5px', lineHeight: 1.6, boxShadow: '0 4px 14px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontWeight: 500 }}>{ocrStatus}</span>
              </div>
            </div>
          )}
          {loading && !ocrStatus && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `linear-gradient(135deg, #1e293b, #334155)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>🤖</div>
              <div style={{ padding: '14px 18px', borderRadius: '16px 16px 16px 4px', background: '#1e293b', display: 'flex', gap: '6px' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Action Bar */}
        <div className="chat-action-bar" style={{ padding: '16px', background: PANEL_BG, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="upload-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button onClick={() => { setActiveUploadContext('AADHAAR'); fileRef.current?.click(); }}
              style={{ flex: 1, padding: '10px 8px', borderRadius: '10px', border: '1px solid rgba(96, 165, 250, 0.2)', background: 'rgba(59, 130, 246, 0.05)', color: '#93c5fd', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '14px' }}>📄</span> Aadhaar Upload</div>
              <div style={{ fontSize: '9px', fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}><span>🔒</span> Secured by Gemini</div>
            </button>
            <button onClick={() => { setActiveUploadContext('PAN'); fileRef.current?.click(); }}
              style={{ flex: 1, padding: '10px 8px', borderRadius: '10px', border: '1px solid rgba(96, 165, 250, 0.2)', background: 'rgba(59, 130, 246, 0.05)', color: '#93c5fd', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '14px' }}>💳</span> PAN Upload</div>
              <div style={{ fontSize: '9px', fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}><span>🔒</span> Secured by Gemini</div>
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleOCRUpload(f, activeUploadContext); }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#020617', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Type your response here..." rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px 14px', fontSize: '14px', color: TEXT_LIGHT, outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              style={{ background: loading || !input.trim() ? '#1e293b' : ACCENT, color: '#fff', border: 'none', borderRadius: '10px', width: '40px', height: '40px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: loading || !input.trim() ? 'none' : `0 4px 12px ${ACCENT_GLOW}` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT PREVIEW PANEL ── */}
      <div className="preview-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e2e8f0' }}>
        {/* Toolbar */}
        <div className="preview-toolbar" style={{ background: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', zIndex: 5 }}>
          <div className="preview-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📄</span> Document Live Preview
            </span>
            {previewLoading && <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '4px 12px', borderRadius: '12px', fontWeight: 600, border: '1px solid #e2e8f0' }}>Syncing...</span>}
            {!previewLoading && isComplete && (
              <span style={{ fontSize: '12px', color: '#16a34a', background: '#dcfce7', padding: '4px 12px', borderRadius: '12px', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: '#16a34a', borderRadius: '50%' }}></span> Ready to Download
              </span>
            )}
          </div>
          <div className="toolbar-buttons" style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleDownloadPDF} disabled={!iframeUrl}
              style={{ background: iframeUrl ? '#ef4444' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: iframeUrl ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: iframeUrl ? `0 4px 12px rgba(239, 68, 68, 0.3)` : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Download PDF
            </button>
            <button onClick={handleDownloadDOCX} disabled={!iframeUrl}
              style={{ background: iframeUrl ? '#2563eb' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: iframeUrl ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: iframeUrl ? `0 4px 12px rgba(37, 99, 235, 0.3)` : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Download DOCX
            </button>
          </div>
        </div>
        {/* iframe preview */}
        <div className="preview-iframe-container" style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <style>{`
            /* // Mobile responsive added */
            @media (max-width: 768px) {
              .app-container { flex-direction: column !important; height: auto !important; min-height: 100vh; overflow-x: hidden; }
              .chat-panel { width: 100% !important; min-width: 100% !important; height: 100vh !important; }
              .preview-panel { width: 100% !important; height: 100vh !important; }
              .upload-buttons { flex-direction: column !important; }
              .chat-action-bar { position: sticky !important; bottom: 0 !important; z-index: 50 !important; background: #0f172a !important; }
              .chat-input { font-size: 16px !important; }
              .preview-toolbar { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; padding: 16px !important; }
              .preview-toolbar-left { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
              .toolbar-buttons { width: 100% !important; flex-direction: column !important; }
              .toolbar-buttons button { width: 100% !important; justify-content: center !important; }
              .preview-iframe-container { padding: 16px !important; }
            }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
          <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', height: '100%', minHeight: '800px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {iframeUrl ? (
              <iframe src={iframeUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview" />
            ) : (
              <DeedPreview data={data} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
