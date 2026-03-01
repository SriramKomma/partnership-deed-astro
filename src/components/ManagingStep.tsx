interface Props {
  partners: Array<{ name: string }>;
  selected: number[];
  onChange: (indices: number[]) => void;
  onDone: () => void;
}

const PRIMARY = '#01334c';

export default function ManagingStep({ partners, selected, onChange, onDone }: Props) {
  const toggle = (i: number) => {
    onChange(selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i]);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '44px', height: '44px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${PRIMARY}, #01557a)`,
          fontSize: '20px', marginBottom: '12px',
        }}>🏛️</div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          Managing Partners
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Select which partners will actively manage the firm
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {partners.map((p, i) => {
          const isSelected = selected.includes(i);
          return (
            <div
              key={i}
              onClick={() => toggle(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${isSelected ? PRIMARY : '#e2e8f0'}`,
                background: isSelected ? 'rgba(1,51,76,0.04)' : '#f8fafc',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                border: `2px solid ${isSelected ? PRIMARY : '#cbd5e1'}`,
                background: isSelected ? PRIMARY : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {isSelected && <span style={{ color: '#fff', fontSize: '13px', fontWeight: 800 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Partner {i + 1}: {p.name || `Partner ${i + 1}`}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  {isSelected ? '✅ Managing Partner' : 'Not a managing partner'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => selected.length > 0 && onDone()}
        disabled={selected.length === 0}
        style={{
          width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
          background: selected.length > 0 ? `linear-gradient(135deg, ${PRIMARY}, #01557a)` : '#e2e8f0',
          color: selected.length > 0 ? '#fff' : '#94a3b8', fontSize: '14px', fontWeight: 700,
          cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
          boxShadow: selected.length > 0 ? `0 4px 14px rgba(1,51,76,0.3)` : 'none',
          transition: 'all 0.2s',
        }}
      >
        Continue to Business Details →
      </button>
      {selected.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#94a3b8', marginTop: '8px' }}>
          Select at least one managing partner
        </p>
      )}
    </div>
  );
}
