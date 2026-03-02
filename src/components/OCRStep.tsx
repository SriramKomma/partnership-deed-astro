import { useState, useRef } from 'react';
import { ocrAadhaar, ocrPAN } from '../lib/ocr';
import type { PartnerOCR } from '../lib/ocr';

interface Props {
  partnerIndex: number;
  totalPartners: number;
  initial: Partial<PartnerOCR>;
  onDone: (data: Partial<PartnerOCR>) => void;
}

const PRIMARY = '#01334c';

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: '8px',
          border: '1.5px solid #e2e8f0', fontSize: '13px', color: '#0f172a',
          outline: 'none', boxSizing: 'border-box', background: '#f8fafc',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = PRIMARY)}
        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
      />
    </div>
  );
}

type UploadState = 'idle' | 'processing' | 'done' | 'error';

function UploadCard({
  label, icon, state, fileName, onFile, hint,
}: {
  label: string; icon: string; state: UploadState; fileName: string;
  onFile: (f: File) => void; hint: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const colors: Record<UploadState, string> = {
    idle: '#e2e8f0', processing: '#fed7aa', done: '#bbf7d0', error: '#fecaca',
  };
  const labels: Record<UploadState, string> = {
    idle: 'Click to upload', processing: '🔍 Reading document…', done: '✅ Extracted', error: '❌ Try again',
  };

  return (
    <div
      onClick={() => state !== 'processing' && ref.current?.click()}
      style={{
        border: `2px dashed ${colors[state]}`, borderRadius: '12px', padding: '20px 16px',
        textAlign: 'center', cursor: state === 'processing' ? 'wait' : 'pointer',
        background: state === 'done' ? '#f0fdf4' : state === 'processing' ? '#fff7ed' : '#f8fafc',
        transition: 'all 0.2s',
      }}
    >
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div style={{ fontSize: '28px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{hint}</div>
      <div style={{
        fontSize: '11.5px', fontWeight: 600,
        color: state === 'done' ? '#16a34a' : state === 'error' ? '#dc2626' : state === 'processing' ? '#d97706' : PRIMARY,
      }}>
        {state === 'done' ? fileName : labels[state]}
      </div>

      
    </div>
  );
}

export default function OCRStep({ partnerIndex, totalPartners, initial, onDone }: Props) {
  const [data, setData] = useState<Partial<PartnerOCR>>(initial);
  const [aadhaarState, setAadhaarState] = useState<UploadState>('idle');
  const [panState, setPanState] = useState<UploadState>('idle');
  const [aadhaarFile, setAadhaarFile] = useState('');
  const [panFile, setPanFile] = useState('');
  const [aadhaarFileObj, setAadhaarFileObj] = useState<File | null>(null);
  const [panFileObj, setPanFileObj] = useState<File | null>(null);
  const [error, setError] = useState('');

  const upd = (key: keyof PartnerOCR) => (v: string) => setData(d => ({ ...d, [key]: v }));

  const handleAadhaar = async (file: File) => {
    setAadhaarFile(file.name);
    setAadhaarFileObj(file);
    setAadhaarState('processing');
    setError('');
    try {
      const extracted = await ocrAadhaar(file);
      setData(d => ({ ...d, ...extracted }));
      setAadhaarState('done');
    } catch {
      setAadhaarState('error');
      setError('Could not read Aadhaar. Please try a clearer image.');
    }
  };

  const handlePAN = async (file: File) => {
    setPanFile(file.name);
    setPanFileObj(file);
    setPanState('processing');
    setError('');
    try {
      const extracted = await ocrPAN(file);
      setData(d => ({ ...d, ...extracted }));
      setPanState('done');
    } catch {
      setPanState('error');
      setError('Could not read PAN. Please try a clearer image.');
    }
  };

  // Per-document re-ocr actions
  const handleAadhaarRescan = async () => {
    if (!aadhaarFileObj) return;
    setAadhaarState('processing');
    setError('');
    try {
      const extracted = await ocrAadhaar(aadhaarFileObj);
      setData(d => ({ ...d, ...extracted }));
      setAadhaarState('done');
    } catch {
      setAadhaarState('error');
      setError('Could not read Aadhaar. Please try a clearer image.');
    }
  };

  const handlePANRescan = async () => {
    if (!panFileObj) return;
    setPanState('processing');
    setError('');
    try {
      const extracted = await ocrPAN(panFileObj);
      setData(d => ({ ...d, ...extracted }));
      setPanState('done');
    } catch {
      setPanState('error');
      setError('Could not read PAN. Please try a clearer image.');
    }
  };

  const canProceed = !!(data.name?.trim() && data.age?.trim() && data.address?.trim());

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '44px', height: '44px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${PRIMARY}, #01557a)`,
          fontSize: '20px', marginBottom: '12px',
        }}>👤</div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
          Partner {partnerIndex + 1} of {totalPartners}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Upload documents to auto-fill details, or type them manually
        </p>
      </div>

      {/* Upload cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <UploadCard
          label="Aadhaar Card" icon="🪪" state={aadhaarState}
          fileName={aadhaarFile} onFile={(f) => {
            setAadhaarFile(f.name);
            setAadhaarFileObj(f);
            handleAadhaar(f);
          }}
          hint="Front side (JPG / PNG)"
        />
        <UploadCard
          label="PAN Card" icon="📋" state={panState}
          fileName={panFile} onFile={(f) => {
            setPanFile(f.name);
            setPanFileObj(f);
            handlePAN(f);
          }}
          hint="Front side (JPG / PNG)"
        />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#dc2626', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Per-document Re-OCR controls (if files are uploaded) */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '6px 0 12px' }}>
        <button onClick={handleAadhaarRescan} disabled={!aadhaarFileObj}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #2a3560', background: aadhaarFileObj ? '#1d4ed8' : '#ccc', color: '#fff', cursor: aadhaarFileObj ? 'pointer' : 'not-allowed' }}>
          Re-OCR Aadhaar
        </button>
        <button onClick={handlePANRescan} disabled={!panFileObj}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #2a3560', background: panFileObj ? '#1d4ed8' : '#ccc', color: '#fff', cursor: panFileObj ? 'pointer' : 'not-allowed' }}>
          Re-OCR PAN
        </button>
      </div>

      {/* Editable fields */}
      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
          ✏️ Review &amp; Edit Extracted Details
        </p>
        <Field label="Full Name" value={data.name || ''} onChange={upd('name')} />
        <Field label="Father's Name" value={data.fatherName || ''} onChange={upd('fatherName')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Age (years)" value={data.age || ''} onChange={upd('age')} />
          <Field label="PAN Number" value={data.pan || ''} onChange={upd('pan')} />
        </div>
        <Field label="Address" value={data.address || ''} onChange={upd('address')} />
      </div>

      <button
        onClick={() => canProceed && onDone(data)}
        disabled={!canProceed}
        style={{
          width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
          background: canProceed ? `linear-gradient(135deg, ${PRIMARY}, #01557a)` : '#e2e8f0',
          color: canProceed ? '#fff' : '#94a3b8', fontSize: '14px', fontWeight: 700,
          cursor: canProceed ? 'pointer' : 'not-allowed',
          boxShadow: canProceed ? `0 4px 14px rgba(1,51,76,0.3)` : 'none',
          transition: 'all 0.2s',
        }}
      >
        {partnerIndex + 1 < totalPartners ? `Next: Partner ${partnerIndex + 2} →` : 'Continue →'}
      </button>
      {!canProceed && (
        <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#94a3b8', marginTop: '8px' }}>
          Name, Age and Address are required to continue
        </p>
      )}
    </div>
  );
}
