"use client"

import { maskPhone, maskCpfCnpj, maskCnpj } from "@/lib/masks"

type MaskType = "phone" | "cpfcnpj" | "cnpj"

const MASK_FNS: Record<MaskType, (v: string) => string> = {
  phone: maskPhone,
  cpfcnpj: maskCpfCnpj,
  cnpj: maskCnpj,
}

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  mask: MaskType
  value: string
  onChange: (formatted: string) => void
}

export default function MaskedInput({ mask, value, onChange, className, ...rest }: MaskedInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode={mask === "phone" ? "tel" : "numeric"}
      value={value}
      onChange={(e) => onChange(MASK_FNS[mask](e.target.value))}
      className={
        className ??
        "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      }
    />
  )
}
