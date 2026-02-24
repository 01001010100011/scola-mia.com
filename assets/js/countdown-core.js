function toDate(targetAt) {
  const date = new Date(targetAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDiffMs(targetAt) {
  const date = toDate(targetAt);
  if (!date) return null;
  return date.getTime() - Date.now();
}

export function getRemainingParts(targetAt) {
  const diff = getDiffMs(targetAt);
  if (diff === null) return null;
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function getRemainingTotals(targetAt) {
  const diff = getDiffMs(targetAt);
  if (diff === null) return null;
  if (diff <= 0) return null;

  return {
    hoursTotal: Math.floor(diff / 3600000),
    minutesTotal: Math.floor(diff / 60000),
    secondsTotal: Math.floor(diff / 1000)
  };
}

export function formatCountdown(targetAt) {
  const parts = getRemainingParts(targetAt);
  if (!parts) return "Evento concluso";

  const labels = [
    parts.days > 0 ? `${parts.days} ${parts.days === 1 ? "giorno" : "giorni"}` : null,
    parts.hours > 0 ? `${parts.hours} ${parts.hours === 1 ? "ora" : "ore"}` : null,
    parts.minutes > 0 ? `${parts.minutes} ${parts.minutes === 1 ? "minuto" : "minuti"}` : null
  ].filter(Boolean);

  if (!labels.length) return "meno di 1 minuto";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} e ${labels[2]}`;
}

export function formatTargetDate(targetAt) {
  const date = toDate(targetAt);
  if (!date) return "";
  return date.toLocaleDateString("it-IT", {
    timeZone: "Europe/Rome",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function formatTargetDateTime(targetAt) {
  const date = toDate(targetAt);
  if (!date) return "";
  const dateLabel = formatTargetDate(targetAt);
  const timeLabel = date.toLocaleTimeString("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${dateLabel} · ${timeLabel}`;
}
