import { Download, Puzzle } from 'lucide-react';

export default function ExtensionInstallCard() {
  return (
    <div className="bg-stone-50 rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-wheat-100 rounded-full flex items-center justify-center">
            <Puzzle className="w-5 h-5 text-wheat-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-stone-900">
              Extensão do navegador
            </h2>
            <p className="text-sm text-stone-500">
              Configure o Gmail e importe suas compras da Amazon pelo Celeiro
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="extension-install-button"
          disabled
          className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          title="A instalação pela loja estará disponível em breve"
        >
          <Download className="w-4 h-4" />
          Instalar extensão
          <span className="text-xs font-normal opacity-80">Em breve</span>
        </button>

        <details className="group mt-4 border border-stone-200 rounded-lg bg-white">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-stone-700 hover:text-stone-900">
            Instalação manual
          </summary>
          <div className="px-4 pb-4 border-t border-stone-100 text-sm text-stone-600 space-y-4">
            <p className="pt-4">
              Primeiro, tenha a pasta <code className="bg-stone-100 px-1 rounded">chrome-extension</code> do Celeiro no computador.
            </p>

            <div>
              <p className="font-medium text-stone-800">Chrome</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Abra <code className="bg-stone-100 px-1 rounded">chrome://extensions</code>.</li>
                <li>Ative o modo do desenvolvedor.</li>
                <li>Clique em “Carregar sem compactação” e selecione a pasta da extensão.</li>
              </ol>
            </div>

            <div>
              <p className="font-medium text-stone-800">Firefox</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Abra <code className="bg-stone-100 px-1 rounded">about:debugging#/runtime/this-firefox</code>.</li>
                <li>Clique em “Carregar extensão temporária”.</li>
                <li>Selecione o arquivo <code className="bg-stone-100 px-1 rounded">manifest.json</code> da pasta.</li>
              </ol>
              <p className="text-xs text-stone-500 mt-2">
                No Firefox, a instalação manual é temporária até publicarmos a versão assinada.
              </p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
