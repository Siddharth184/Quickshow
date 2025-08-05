export default function isoTimeFormat(timeString) {
  if (!timeString) return "Invalid timeee";

  const date = new Date(timeString);

  if (isNaN(date.getTime())) return "Invalid timee";

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
