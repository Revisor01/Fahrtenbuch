import React from 'react';
import { STATUS_ORDER, statusKlassen, statusLabel } from '../../utils/statusLabels';

// Status mit Form, Wort und Farbe (WCAG 1.4.1); variant badge, dot oder progress; status 'offen' | 'eingereicht' | 'erhalten'.

// Icon 16px innerhalb der Badge-Pille
function BadgeIcon({ status }) {
  if (status === 'offen') {
    // Erfasst: gestrichelter leerer Ring
    return <span className="status-icon status-icon-erfasst" aria-hidden="true" />;
  }
  if (status === 'eingereicht') {
    // Eingereicht: gefüllter Kreis mit ↑
    return <span className="status-icon status-icon-eingereicht" aria-hidden="true">↑</span>;
  }
  // Erstattet: gefüllter Kreis mit ✓
  return <span className="status-icon status-icon-erstattet" aria-hidden="true">✓</span>;
}

function Badge({ status, className }) {
  const pillClass = statusKlassen(status).badge;

  return (
    <span className={`${pillClass}${className ? ` ${className}` : ''}`}>
      <BadgeIcon status={status} />
      <span>{statusLabel(status)}</span>
    </span>
  );
}

// Punkt + Wort — nie der Punkt allein
function Dot({ status, className }) {
  return (
    <span className={`status-dot ${statusKlassen(status).dot}${className ? ` ${className}` : ''}`}>
      <span className="status-dot-circle" aria-hidden="true" />
      <span>{statusLabel(status)}</span>
    </span>
  );
}

// Fortschritt: erledigt --ok, aktuell --accent, offen gestrichelt.
function Progress({ status, className }) {
  const currentIndex = Math.max(STATUS_ORDER.indexOf(status), 0);

  return (
    <div
      className={`status-progress${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`Status: ${statusLabel(status)}`}
    >
      {STATUS_ORDER.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'open';
        return (
          <React.Fragment key={step}>
            {i > 0 && <span className={`status-progress-line status-progress-line-${i <= currentIndex ? 'done' : 'open'}`} aria-hidden="true" />}
            <span className="status-progress-station">
              <span className={`status-progress-circle status-progress-${state}`} aria-hidden="true">
                {/* „Erstattet" ist die Endstation — dort gehört der Haken
                    auch dann hin, wenn sie die aktuelle Station ist */}
                {state === 'done' || (state === 'current' && step === 'erhalten')
                  ? '✓'
                  : state === 'current' && step === 'eingereicht'
                    ? '↑'
                    : ''}
              </span>
              <span className={`status-progress-label${state === 'open' ? ' status-progress-label-open' : ''}`}>
                {statusLabel(step)}
              </span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StatusBadge({ status = 'offen', variant = 'badge', className }) {
  if (variant === 'dot') return <Dot status={status} className={className} />;
  if (variant === 'progress') return <Progress status={status} className={className} />;
  return <Badge status={status} className={className} />;
}

export default StatusBadge;
