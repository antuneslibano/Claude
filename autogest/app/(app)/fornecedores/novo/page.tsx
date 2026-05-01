import FornecedorForm from "../fornecedor-form"

export default function NovoFornecedorPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Novo Fornecedor</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cadastrar novo fornecedor de baterias</p>
      </div>
      <FornecedorForm />
    </div>
  )
}
