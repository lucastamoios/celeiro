# Celeiro Amazon Sync - Chrome Extension

Extensão do Chrome para sincronizar pedidos da Amazon com o Celeiro, permitindo categorização automática de transações bancárias.

## Instalação

### 1. Gerar Ícones PNG (necessário)

A extensão precisa de ícones PNG. Converta os SVGs fornecidos:

```bash
cd chrome-extension/icons

# Usando ImageMagick (se instalado)
convert icon16.svg icon16.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png

# Ou usando rsvg-convert (se instalado)
rsvg-convert -w 16 -h 16 icon16.svg -o icon16.png
rsvg-convert -w 48 -h 48 icon48.svg -o icon48.png
rsvg-convert -w 128 -h 128 icon128.svg -o icon128.png
```

Ou simplesmente crie os PNGs manualmente com qualquer editor de imagem.

### 2. Instalar no Chrome

1. Abra `chrome://extensions/` no Chrome
2. Ative o "Modo do desenvolvedor" (canto superior direito)
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `chrome-extension`

## Uso

### Configuração Inicial

1. Clique no ícone da extensão na barra do Chrome
2. Configure:
   - **URL da API**: URL do backend do Celeiro (ex: `http://localhost:8080`)
   - **Token**: Seu token JWT de autenticação
   - **Mês/Ano**: Período dos pedidos a sincronizar

### Sincronização

1. Faça login na Amazon no navegador
2. Clique em "Sincronizar Pedidos Amazon"
3. A extensão irá:
   - Navegar para a página de pedidos
   - Extrair informações de cada pedido
   - Paginar automaticamente
   - Enviar dados para o Celeiro

### Botão "Abrir Amazon Orders"

Abre diretamente a página de pedidos da Amazon filtrada pelo mês/ano selecionado.

## Dados Extraídos

Para cada pedido, a extensão extrai:
- **order_id**: Identificador único do pedido
- **date**: Data do pedido (formato ISO)
- **total**: Valor total do pedido
- **items**: Lista de produtos comprados

## API Backend

A extensão envia os dados para:
```
POST /api/v1/financial/amazon/sync
```

Payload:
```json
{
  "orders": [
    {
      "order_id": "123-4567890-1234567",
      "date": "15 de dezembro de 2024",
      "parsed_date": {
        "day": 15,
        "month": 12,
        "year": 2024,
        "iso": "2024-12-15"
      },
      "total": "R$ 123,45",
      "parsed_total": 123.45,
      "items": [
        { "name": "Nome do Produto", "url": "https://amazon.com.br/dp/..." }
      ]
    }
  ],
  "month": 12,
  "year": 2024
}
```

## Comportamento de Paginação

A extensão navega automaticamente pelas páginas de pedidos da Amazon:

1. **Extração automática**: Extrai pedidos de cada página sequencialmente
2. **Detecção de mês anterior**: Para quando encontra pedidos do mês anterior ao selecionado
3. **Página extra de segurança**: Sempre busca **UMA PÁGINA ADICIONAL** após detectar pedidos do mês anterior
   - Isso garante que nenhum pedido seja perdido (a ordenação da Amazon nem sempre é perfeita)
4. **Limite de segurança**: Máximo de 20 páginas para evitar loops infinitos

## Parsing de Dados

### Datas (Português Brasileiro)

A extensão parseia datas no formato `15 de dezembro de 2024`:

**Meses suportados:**
- janeiro, fevereiro, março/marco, abril, maio, junho
- julho, agosto, setembro, outubro, novembro, dezembro

### Valores Monetários

Parseia o formato Real Brasileiro:
- `R$ 1.234,56` → `1234.56` (float)
- Remove pontos de milhar, converte vírgula para ponto decimal

## Troubleshooting

### Extensão não extrai pedidos

1. Verifique se está logado na Amazon
2. Tente recarregar a página de pedidos
3. Verifique o console do navegador (F12) para erros

### Erro de API

1. Verifique se a URL da API está correta
2. Verifique se o token está válido
3. Verifique se o backend está rodando

### Ícones não aparecem

Gere os arquivos PNG conforme instruções acima.

## Desenvolvimento

### Estrutura de Arquivos

```
chrome-extension/
├── manifest.json      # Configuração da extensão
├── popup.html         # Interface do popup
├── popup.js           # Lógica do popup
├── content.js         # Script injetado nas páginas Amazon
├── background.js      # Service worker para operações longas
├── icons/             # Ícones da extensão
└── README.md          # Este arquivo
```

### Debug

**IMPORTANTE: Existem dois consoles diferentes!**

1. **Console do Popup** (logs de `popup.js`):
   - Clique com botão direito no ícone da extensão
   - Selecione "Inspecionar popup"
   - Os logs de navegação e chamadas de API aparecem aqui

2. **Console da Página Amazon** (logs de `extractOrders()`):
   - Pressione F12 na página da Amazon
   - A função `extractOrders()` é injetada na página Amazon
   - Logs de extração de pedidos aparecem NESTE console, não no popup

3. **Service Worker**:
   - Abra `chrome://extensions/`
   - Clique em "Service Worker" para ver logs do background

**Dica**: Quando a extensão navega para uma nova página, o DevTools anexado à página anterior pode desconectar. Reabra o DevTools após a navegação se necessário.
