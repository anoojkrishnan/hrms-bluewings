import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export interface HelpContent {
  title:          string;
  description:    string;
  why:            string;
  prerequisites?: Array<{ label: string; route?: string }>;
  steps:          string[];
}

interface HelpPanelProps {
  content:      HelpContent;
  defaultOpen?: boolean;
  storageKey:   string;
}

export function HelpPanel({ content, defaultOpen = false, storageKey }: HelpPanelProps) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved === 'true';
    } catch { /* */ }
    return defaultOpen;
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, String(open)); } catch { /* */ }
  }, [open, storageKey]);

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      background: 'var(--color-background)',
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          gap: 8,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          <span style={{ fontSize: '1rem' }}>💡</span>
          How does this work?
        </span>
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
          display: 'inline-block',
        }}>▼</span>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          {/* Title + description */}
          <h4 style={{ margin: '14px 0 6px', fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
            {content.title}
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {content.description}
          </p>

          {/* Why */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
              Why this matters
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {content.why}
            </p>
          </div>

          {/* Prerequisites */}
          {content.prerequisites && content.prerequisites.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                Set up first
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {content.prerequisites.map(p => (
                  p.route ? (
                    <Link
                      key={p.label}
                      to={p.route}
                      style={{
                        fontSize: '0.8125rem',
                        padding: '2px 10px',
                        borderRadius: 99,
                        border: '1px solid var(--color-primary)',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        background: 'transparent',
                      }}
                    >
                      {p.label} →
                    </Link>
                  ) : (
                    <span
                      key={p.label}
                      style={{
                        fontSize: '0.8125rem',
                        padding: '2px 10px',
                        borderRadius: 99,
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.label}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
              How to get started
            </span>
            <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
              {content.steps.map((step, i) => (
                <li key={i} style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 2 }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
