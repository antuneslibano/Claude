// Funções de máscara — sem dependências externas

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskCpf(d: string): string {
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
}

export function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function maskCpfCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 11) return maskCpf(d)
  return maskCnpj(d)
}

// Aplica máscara ao valor já armazenado (para inicializar forms de edição)
export function applyPhone(v: string | null | undefined): string {
  return v ? maskPhone(v) : ""
}

export function applyCpfCnpj(v: string | null | undefined): string {
  if (!v) return ""
  const d = v.replace(/\D/g, "")
  return d.length <= 11 ? maskCpf(d) : maskCnpj(d)
}

export function applyCnpj(v: string | null | undefined): string {
  return v ? maskCnpj(v) : ""
}
