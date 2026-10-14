// src/components/StatusBadge.jsx
const CORES = {
  aberto: "bg-blue-100 text-blue-800",
  "em andamento": "bg-amber-100 text-amber-800",
  resolvido: "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap ${
        CORES[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
}
