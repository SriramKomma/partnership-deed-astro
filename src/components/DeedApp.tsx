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

      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>1)</span><div style={{ flex: 1, textAlign: 'justify' }}>The partnership business shall be carried on under the name and style as <span style={b}>M/s. <span style={hl(d.businessName)}>{ph(d.businessName, 'Firm Name')}</span></span>. The partnership firm shall come into existence with effect from <span style={{ ...b, ...hl(d.durationStartDate) }}>{ph(d.durationStartDate, 'Start Date')}</span>.<br/><br/>{d.durationType === 'AT WILL' ? 'The duration of the firm shall be at WILL of the partners.' : `The partnership firm shall come into existence from ${ph(d.durationStartDate, 'Start Date')}.`}</div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>2)</span><div style={{ flex: 1, textAlign: 'justify' }}>The <span style={b}>Principal place of business</span> of the firm shall be at <span style={hl(d.registeredAddress)}>{ph(d.registeredAddress, 'Registered Address')}</span>.</div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>3)</span><div style={{ flex: 1, textAlign: 'justify' }}>The <span style={b}>objective of partnership</span> is to carry on the following business:<br/><br/><div style={{ paddingLeft: '20px' }}>a. <span style={hl(d.businessObjective)}>{ph(d.businessObjective, 'Business Objectives')}</span></div></div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>4)</span><div style={{ flex: 1, textAlign: 'justify' }}>
        <span style={b}>Capital Contribution of the Partners:</span><br /><br />
        <div style={{ paddingLeft: '20px' }}>
          The total capital contribution of the partners in the firm shall be in the following proportions:<br />
          {ps.length === 0 ? <span><span style={hl('')}>[Partner capital details]</span><br/></span>
            : ps.map((p, i) => <span key={i}>&bull; {partyLabels[i] || `${i + 1}th`} Party (<span style={{ ...b, ...hl(p.fullName) }}>{ph(p.fullName, `P${i + 1}`)}</span>): <span style={hl(p.capitalContribution)}>{ph(p.capitalContribution, '%')}</span>%<br /></span>)}
        </div>
      </div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>5)</span><div style={{ flex: 1, textAlign: 'justify' }}>
        The parties of the{' '}
        {managers.length > 0
          ? <>{managers.map((p, i) => <span key={i}><span style={{ ...b, ...hl(p.fullName), color: ACCENT }}>{ph(p.fullName, `Manager`)}</span>{i < managers.length - 1 ? ' & ' : ''}</span>)} shall be the <span style={b}>managing partner's</span> and is authorized and empowered to do the following acts, deeds and things on behalf of the firm:</>
          : <span style={hl('')}>[Managing partners to be selected]</span>}
        <br/><br/>
        <div style={{ paddingLeft: '20px' }}>
          a. To manage the business of the partnership firm with a power to appoint remuneration, etc. They shall also have the power to dispense with the service of such personnel that are not required.<br/>
          b. To negotiate any business transactions and enter into agreements on behalf of the firm and to enter into all/any contracts and sub-contracts on either way. To enter to the sale and purchase agreements relating to the objective of the business.<br/>
          c. To enter into correspondence with government departments, quasi-govt departments, public and private organizations, individuals, etc regarding the partnership business.<br/>
          d. To incur all expenses necessary for the conduct of the business.<br/>
          e. To borrow moneys against credit of partnership, if necessary by hypothecating or creating a charge upon the assets of the partnership.<br/>
          f. To be in custody of all account books, documents, negotiable instruments and all other documents pertaining to the business.<br/>
          g. To look after the proper upkeep of books of accounts required for the business and to supervise the same at regular intervals.<br/>
          h. To open bank account/accounts in the name of the partnership firm.<br/>
          i. To put all the monies, cheques etc., which are not immediately required for the conduct of the business into the bank account, opened for the Partnership business.<br/>
          j. To do all other acts and things that are necessary for carrying on the business.<br/>
          k. The managing partner's are empowered to borrow money as and when found necessary for the business from any nationalized or schedule bank/banks or any other financial institutions from time to time and execute necessary actions at all the times.
        </div>
      </div></div>
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>6)</span><div style={{ flex: 1, textAlign: 'justify' }}>The firm shall maintain one or more banking accounts (e.g., current accounts, overdrafts, cash credit, etc.) as may be decided by the partners from time to time. The said bank accounts shall be operated jointly by{' '}{bankers.length > 0 ? bankers.map((p, i) => <span key={i}>the Party of the "<span style={{ ...b, ...hl(p.fullName), color: ACCENT }}>{partyLabels[i] || `${i+1}th`} Part," {ph(p.fullName, 'Bank Partner')}</span>{i < bankers.length - 1 ? ', and ' : ''}</span>) : <span style={hl('')}>[Bank authorized partners]</span>}. The signatures of all authorized partners shall be jointly required for the issuance and authorization of cheques or any other banking transactions. No transaction shall be deemed valid unless signed by all authorized partners.</div></div>
      
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>7)</span><div style={{ flex: 1, textAlign: 'justify' }}>The partners, upon mutual consent of all the partners of this partnership deed appoint any another individual as the authorized signatory for entering into the agreements relating to sale and purchase of the land or/and building.</div></div>
      
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>8)</span><div style={{ flex: 1, textAlign: 'justify' }}>That all the partners shall be working partners of the firm and shall be bound to devote full time and attention to the partnership business and shall be actively engaged in conducting the affairs of the firm and therefore it has been agreed to pay salary/remuneration for the services rendered as per the provisions under section 40(b) of the income tax Act, 1961.<br/><br/><div style={{ paddingLeft: '20px' }}>For the purpose of above calculation of the remuneration shall be on the basis of profit as shown by the books and computed as provided in section 20 to 44 D of chapter IV of the income Tax Act, 1961 as increased by the aggregate of remuneration paid or payable to the partners of the firm if such remuneration has been deducted while computing the net profit.<br/><br/>That the interest at the rate of 12% per annum or as may be prescribed u/s.40(b)(iv) of the Income Tax Act, 1961 or may be any other applicable provisions as may be in force in the Income tax assessment of partnership firm for the relevant accounting year shall be payable to the partners on the amount standing to the credit of the account of the partners. Such interest shall be calculated and credited to the account of each partner at the close of the accounting year.</div></div></div>
      
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>9)</span><div style={{ flex: 1, textAlign: 'justify' }}>The books of accounts of the partnership shall be maintained at the principal place of business and the same shall be closed on the 31st of march every year to arrive at the profit or loss for the period ending and to draw the profit and loss account and the balance sheet to know the financial position of the firm as on date.</div></div>
      
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>10)</span><div style={{ flex: 1, textAlign: 'justify' }}>That the share of the profits or losses of partnership business after taking into account all business and incidental expenses will be as follows:<br /><br />
        <div style={{ paddingLeft: '20px' }}>
          {ps.length === 0 ? <span><span style={hl('')}>[Partner profit shares]</span><br/></span>
            : ps.map((p, i) => <span key={i}><span style={b}>{i + 1}. <span style={hl(p.fullName)}>{ph(p.fullName, `P${i + 1}`)}</span> &nbsp;&nbsp;&nbsp; - <span style={hl(p.profitShare)}>{ph(p.profitShare, '%')}</span>%</span><br /></span>)}
        </div>
      </div></div>

      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>11)</span><div style={{ flex: 1, textAlign: 'justify' }}>Any partner desirous of retiring from the partnership during its continuance can exercise his / her right by giving three calendar months' notice to the other partner.</div></div>
      
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>12)</span><div style={{ flex: 1, textAlign: 'justify' }}>Death, retirement or insolvency of any of the partners shall not to dissolve the partnership. Further in case of death of any of the partners of the firm, the legal heirs as the case may be, shall be entitled to the capital account balance with the share of profit or loss up to the date of death of the partner only. The goodwill of the partnership business shall not be valued in the above circumstances.</div></div>
      
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>13)</span><div style={{ flex: 1, textAlign: 'justify' }}>Any dispute that may arise between the partners shall be referred to an arbitrator whose award shall be final and binding on the parties <span style={b}>MUTTATIS MUTANDIS</span>. The appointment of the arbitrator shall be on mutual consent.</div></div>
      
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>14)</span><div style={{ flex: 1, textAlign: 'justify' }}>The provision of the partnership Act 1932 as in vogue time to time shall apply to this partnership except as otherwise stated above.</div></div>
      
      <div style={cl}><span style={{ minWidth: '26px', fontWeight: 600 }}>15)</span><div style={{ flex: 1, textAlign: 'justify' }}>Any of the terms of this Deed may be amended, abandoned or otherwise be dealt with according to the necessities of the business and convenience of the partners and they shall be reduced to writing on Rs. 100/- stamp paper which shall have the same effect as if embodied in this Deed.</div></div>

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
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);

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

        if (res.extractedData.numPartners && newData.partners.length !== (typeof res.extractedData.numPartners === 'string' ? parseInt(res.extractedData.numPartners) : res.extractedData.numPartners)) {
          const num = typeof res.extractedData.numPartners === 'string' ? parseInt(res.extractedData.numPartners) : res.extractedData.numPartners;
          newData.partners = Array.from({ length: num }, emptyPartner);
        }

        if (res.extractedData.partners) {
          const mergedPartners = [...newData.partners];
          res.extractedData.partners.forEach((pUpdate: any, i: number) => {
            mergedPartners[i] = { ...(mergedPartners[i] || emptyPartner()), ...pUpdate };
          });
          newData.partners = mergedPartners;
        }
        setData(newData);
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
      { role: 'bot', text: '✨ Welcome to OnEasy Legal!\n\nI am your AI legal assistant. I will craft a perfect Partnership Deed for you by simply asking a few conversational questions.\n\nLet’s start building your document. Are you ready?' }
    ]);
    processChat('', 'The user has just arrived. Greet them with a premium, reassuring tone and tell them we will quickly craft their Partnership Deed. Ask for the Number of Partners to begin.');
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

  // ── Live React Document Preview ──
  // The document updates instantly as data changes via DeedPreview native component.
  // There is no network delay, preventing flicker.


  const handleDownloadPDF = async () => {
    const res = await fetch('/api/download-pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deedData: data }),
    });
    if (!res.ok) { alert('PDF generation failed.'); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = `Partnership_Deed.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  const handleDownloadDOCX = async () => {
    const res = await fetch('/api/download-docx', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deedData: data }),
    });
    if (!res.ok) { alert('DOCX generation failed.'); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = `Partnership_Deed.docx`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc' }}>

      {/* ── LEFT CHAT PANEL ── */}
      <div style={{ width: '420px', minWidth: '420px', display: 'flex', flexDirection: 'column', background: BG_DARK, color: TEXT_LIGHT, boxShadow: '8px 0 30px rgba(0,0,0,0.15)', zIndex: 10 }}>
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
        <div style={{ padding: '16px', background: PANEL_BG, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
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
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e2e8f0' }}>
        {/* Toolbar */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📄</span> Document Live Preview
            </span>
            {/* No preview loading state needed since UI is natively reactive */}
            {!isComplete && (
              <span style={{ fontSize: '12px', color: '#16a34a', background: '#dcfce7', padding: '4px 12px', borderRadius: '12px', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: '#16a34a', borderRadius: '50%' }}></span> Ready to Download
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleDownloadPDF}
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: `0 4px 12px rgba(239, 68, 68, 0.3)` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Download PDF
            </button>
            <button onClick={handleDownloadDOCX}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: `0 4px 12px rgba(37, 99, 235, 0.3)` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Download DOCX
            </button>
          </div>
        </div>
        {/* iframe preview */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <style>{`
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
          <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', height: '100%', minHeight: '800px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', overflowY: 'auto' }}>
            <DeedPreview data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
