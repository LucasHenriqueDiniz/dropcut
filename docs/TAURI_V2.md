# Tauri v2 direto para OpenCode

Documento para guiar implementação e manutenção de app desktop com Tauri v2.

## Objetivo

Tauri é a ponte entre:

- frontend web: React/Vite/TypeScript/etc.;
- backend Rust nativo;
- permissões e segurança;
- empacotamento desktop;
- plugins nativos;
- comunicação frontend ↔ Rust.

Use este documento como regra prática para decidir onde mexer e como não quebrar a arquitetura.

---

## Estrutura típica

```txt
project-root/
  AGENTS.md
  package.json
  vite.config.ts
  src/
    main.tsx
    app/
    components/
    lib/
      tauri.ts
  src-tauri/
    Cargo.toml
    tauri.conf.json
    capabilities/
      default.json
    src/
      main.rs
      lib.rs
      commands/
      services/
      models/
      errors.rs
  docs/
    RUST_FOR_TAURI.md
    TAURI_V2.md
```

---

## Separação frontend vs Rust

| Camada | Faz |
|---|---|
| Frontend | UI, formulário, estado visual, tema, loading, toast, chamadas `invoke` |
| Rust | filesystem, processos, validação forte, tasks longas, config local, sidecars |
| Tauri config | janela, bundle, plugins, permissões, capabilities |

Regra: se uma ação pode danificar sistema/arquivos/processos, ela deve passar por Rust com validação.

---

## Comunicação frontend → Rust

Tauri v2 usa commands.

Rust:

```rust
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileInput {
    pub path: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileOutput {
    pub ok: bool,
}

#[tauri::command]
pub async fn open_file(input: OpenFileInput) -> Result<OpenFileOutput, AppError> {
    crate::services::file_service::open_file(input).await
}
```

Registrar command no builder:

```rust
.invoke_handler(tauri::generate_handler![
    commands::files::open_file,
])
```

TypeScript:

```ts
import { invoke } from "@tauri-apps/api/core";

export type OpenFileInput = {
  path: string;
};

export type OpenFileOutput = {
  ok: boolean;
};

export function openFile(input: OpenFileInput) {
  return invoke<OpenFileOutput>("open_file", { input });
}
```

Regra de contrato:

- command name Rust: `snake_case`;
- wrapper TS: `camelCase`;
- input/output tipado nos dois lados;
- `serde(rename_all = "camelCase")` para structs que cruzam a fronteira.

---

## Comunicação Rust → frontend

Usar eventos quando Rust precisa avisar a UI sem esperar o command terminar.

Casos:

- progresso de compressão/conversão;
- logs de tarefa longa;
- status de download;
- batch processing;
- notificação de conclusão;
- erro parcial em vários arquivos.

Modelo:

```txt
frontend chama start_job()
Rust inicia job
Rust emite eventos progress
frontend escuta e atualiza UI
```

Não usar evento para algo simples que cabe em retorno direto de command.

---

## Permissões e capabilities

Tauri v2 usa sistema de permissões/capabilities.

Arquivo típico:

```txt
src-tauri/capabilities/default.json
```

Regra:

- manter permissões mínimas;
- não liberar filesystem inteiro sem necessidade;
- não liberar shell/processo genericamente;
- documentar qualquer permissão nova;
- permissões devem refletir comandos realmente usados pela UI.

Antes de adicionar plugin:

1. verificar se precisa mesmo;
2. ler permissões exigidas;
3. adicionar só permissões mínimas;
4. testar em dev e build.

---

## Configurações principais

Arquivos importantes:

| Arquivo | Função |
|---|---|
| `src-tauri/tauri.conf.json` | app metadata, janela, bundle, build, plugins |
| `src-tauri/Cargo.toml` | dependências Rust e features |
| `package.json` | scripts frontend/Tauri |
| `src-tauri/capabilities/*.json` | permissões |
| `vite.config.ts` | dev server/build frontend |

Antes de editar config:

- ler o arquivo inteiro;
- manter formato existente;
- não trocar JSON por JSON5/TOML sem necessidade;
- não alterar app identifier sem pedido explícito;
- não mexer em bundle target sem saber impacto.

---

## Scripts comuns

Ver primeiro `package.json`.

Exemplos comuns:

```bash
npm run tauri dev
npm run tauri build
```

ou:

```bash
pnpm tauri dev
pnpm tauri build
```

Dentro de `src-tauri/`:

```bash
cargo fmt
cargo check
cargo clippy
cargo test
```

Não assumir npm/pnpm/bun/yarn. Detectar pelo lockfile:

| Lockfile | Package manager provável |
|---|---|
| `package-lock.json` | npm |
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `bun.lockb` / `bun.lock` | bun |

---

## Plugins

Usar plugin quando ele resolve um problema nativo específico.

Exemplos:

- dialog;
- filesystem;
- shell;
- updater;
- notification;
- autostart;
- global shortcut;
- clipboard.

Regra:

- plugin não é decoração;
- plugin amplia superfície de permissão;
- configurar capability mínima;
- criar wrapper TS se usado pelo frontend;
- centralizar chamadas em `src/lib/tauri.ts` ou equivalente.

---

## Sidecars / binários externos

Use sidecar quando o app precisa empacotar ferramenta externa, por exemplo:

- `ffmpeg`;
- binário próprio;
- ferramenta CLI local.

Regras:

- não chamar shell livre;
- passar argumentos como array;
- validar input antes;
- validar output depois;
- emitir progresso quando aplicável;
- tratar falha do processo;
- documentar onde o binário fica e como atualizar.

---

## Operações longas

Não travar UI.

Para tarefas longas:

- command async;
- service isolado;
- evento de progresso;
- cancelamento se possível;
- logs úteis;
- estado de job;
- botão desabilitado durante execução;
- tratamento de erro claro.

Fluxo recomendado:

```txt
startCompression(input) -> { jobId }
frontend escuta compression://progress
frontend escuta compression://done
frontend escuta compression://error
```

Para tarefas simples, retorno direto basta.

---

## Segurança prática

Checklist:

- [ ] validar todo input vindo do frontend;
- [ ] não aceitar comando shell livre;
- [ ] não confiar em extensão de arquivo sem validar;
- [ ] canonicalizar paths quando necessário;
- [ ] checar se path é arquivo/diretório;
- [ ] não armazenar segredo no frontend;
- [ ] não abrir permissões globais;
- [ ] não colocar token/API key em `tauri.conf.json`;
- [ ] não usar devtools em produção salvo pedido explícito;
- [ ] não reduzir CSP sem motivo.

---

## Wrapper TypeScript recomendado

Criar um arquivo central:

```txt
src/lib/tauri.ts
```

Exemplo:

```ts
import { invoke } from "@tauri-apps/api/core";

export type CompressVideoInput = {
  inputPath: string;
  targetMb: number;
};

export type CompressVideoOutput = {
  outputPath: string;
  finalSizeBytes: number;
};

export async function compressVideo(input: CompressVideoInput) {
  return invoke<CompressVideoOutput>("compress_video", { input });
}
```

Benefícios:

- UI não espalha strings de command;
- contratos ficam centralizados;
- refactor é mais seguro;
- facilita testes/mock.

---

## Padrão de UI para command

```ts
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleRun() {
  try {
    setLoading(true);
    setError(null);

    const result = await compressVideo({
      inputPath,
      targetMb,
    });

    // update UI
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    setLoading(false);
  }
}
```

Regras:

- mostrar loading;
- capturar erro;
- não deixar botão disparar múltiplas vezes sem querer;
- não esconder falha silenciosamente.

---

## Build e release

Antes de considerar pronto:

```bash
npm run build
```

ou equivalente real do projeto.

Depois:

```bash
npm run tauri build
```

ou equivalente.

Também rodar:

```bash
cd src-tauri
cargo fmt
cargo check
cargo clippy
```

Se alterou contrato Rust/TS:

- atualizar tipos TS;
- testar fluxo real pela UI;
- verificar capability;
- testar erro esperado.

---

## Quando NÃO usar Tauri command

Não criar command para:

- estado visual;
- abrir/fechar modal;
- validação simples de formulário;
- filtro de lista em memória;
- lógica puramente de UI.

Criar command para:

- ler/escrever arquivos;
- abrir dialog nativo;
- rodar processamento;
- consultar sistema;
- chamar sidecar;
- persistir config local;
- integração OS-level.

---

## Prompt curto para o agente

```txt
This is a Tauri v2 app. Use the frontend for UI only and Rust for native/system-sensitive logic. Add typed Tauri commands with typed TS wrappers. Keep permissions/capabilities minimal. For long tasks, use async commands and events. Do not add plugins, sidecars, broad filesystem access, or shell execution unless necessary and documented.
```

---

## Referências oficiais

- Tauri v2 start: https://v2.tauri.app/start/
- Calling Rust from the frontend: https://v2.tauri.app/develop/calling-rust/
- Calling frontend from Rust: https://v2.tauri.app/develop/calling-frontend/
- Configuration files: https://v2.tauri.app/develop/configuration-files/
- Permissions: https://v2.tauri.app/security/permissions/
- Capabilities: https://v2.tauri.app/security/capabilities/
- Command scopes: https://v2.tauri.app/security/scope/
- Sidecars: https://v2.tauri.app/develop/sidecar/
