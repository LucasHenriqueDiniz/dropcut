# Rust direto para Tauri v2

Documento para guiar OpenCode/Codex/assistente ao mexer no backend Rust de um app Tauri.

## Objetivo

Usar Rust como camada nativa segura do app:

- acesso a arquivos, diretórios e paths;
- execução controlada de processos;
- tarefas pesadas e longas;
- validação de entradas vindas do frontend;
- serialização de dados para o frontend;
- integração com plugins, sidecars e APIs nativas;
- persistência local de configurações quando fizer sentido.

Frontend cuida de UI. Rust cuida de operações nativas e regras sensíveis.

---

## Modelo mental

Em Tauri, o frontend chama Rust por comandos.

Fluxo típico:

```txt
React/TS UI
  ↓ invoke("command_name", { input })
Rust #[tauri::command]
  ↓ valida input
service Rust
  ↓ faz IO/processamento
Result<Output, AppError>
  ↓ serializa para JS
frontend renderiza resultado
```

Regra prática:

- Se envolve sistema operacional, filesystem, processo, path ou validação sensível: Rust.
- Se envolve formulário, estado visual, layout ou feedback: frontend.

---

## Estrutura recomendada

```txt
src-tauri/
  Cargo.toml
  tauri.conf.json
  capabilities/
    default.json
  src/
    main.rs
    lib.rs
    commands/
      mod.rs
      files.rs
      video.rs
      settings.rs
    services/
      mod.rs
      file_service.rs
      video_service.rs
      settings_service.rs
    models/
      mod.rs
      files.rs
      video.rs
      settings.rs
    errors.rs
```

### Responsabilidade por pasta

| Pasta/arquivo | Responsabilidade |
|---|---|
| `main.rs` | entrada mínima do binário |
| `lib.rs` | montagem do app, plugins, commands |
| `commands/` | funções expostas ao frontend |
| `services/` | lógica real, IO, processos, validações |
| `models/` | structs de input/output |
| `errors.rs` | erro central serializável |
| `capabilities/` | permissões do Tauri |

---

## Comandos Cargo essenciais

Rodar dentro de `src-tauri/`.

```bash
cargo fmt
cargo check
cargo clippy
cargo test
```

Para build final via Tauri normalmente rode pelo package manager do frontend:

```bash
npm run tauri build
```

ou:

```bash
pnpm tauri build
```

Não inventar comandos. Ver `package.json` antes.

---

## Regras de Rust no projeto

### 1. Usar tipos explícitos

Evitar `String` com JSON manual.

Ruim:

```rust
#[tauri::command]
fn process(data: String) -> String {
    data
}
```

Bom:

```rust
#[derive(Debug, serde::Deserialize)]
pub struct CompressVideoInput {
    pub input_path: String,
    pub target_mb: u32,
}

#[derive(Debug, serde::Serialize)]
pub struct CompressVideoOutput {
    pub output_path: String,
    pub final_size_bytes: u64,
}

#[tauri::command]
pub async fn compress_video(
    input: CompressVideoInput,
) -> Result<CompressVideoOutput, AppError> {
    video_service::compress_video(input).await
}
```

### 2. `commands/` não deve virar service

Comando deve:

1. receber input;
2. chamar validação/service;
3. retornar output ou erro.

Exemplo:

```rust
#[tauri::command]
pub async fn scan_folder(input: ScanFolderInput) -> Result<ScanFolderOutput, AppError> {
    crate::services::file_service::scan_folder(input).await
}
```

A lógica pesada fica em `services/`.

### 3. Não usar `unwrap()` em fluxo normal

Evitar:

```rust
let file = std::fs::read_to_string(path).unwrap();
```

Preferir:

```rust
let file = std::fs::read_to_string(path)
    .map_err(|err| AppError::Io(format!("Failed to read file: {err}")))?;
```

Pode usar `expect()` apenas quando a falha indica bug de programação, não erro de usuário.

### 4. Validar input vindo do frontend

Todo input recebido do frontend é não confiável.

Validar:

- path existe;
- extensão é permitida;
- tamanho do arquivo é aceitável;
- diretório de saída é seguro;
- parâmetros numéricos estão dentro do range;
- nomes de arquivo não têm caracteres problemáticos;
- comando externo não recebe argumento livre perigoso.

### 5. Não executar shell livre

Evitar:

```rust
Command::new("cmd")
    .args(["/C", &user_input])
    .spawn();
```

Preferir:

```rust
Command::new(ffmpeg_path)
    .arg("-i")
    .arg(&input_path)
    .arg("-b:v")
    .arg(video_bitrate)
    .arg(&output_path)
    .spawn();
```

Argumentos devem ser explícitos. Não concatenar string de comando.

---

## Erro central

Criar um `AppError` serializável para o frontend.

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("I/O error: {0}")]
    Io(String),

    #[error("Process failed: {0}")]
    ProcessFailed(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
```

Regra:

- Rust retorna erro técnico estruturado.
- Frontend traduz para mensagem amigável.
- Não vazar stacktrace/detalhes internos em produção.

---

## Serde

Usar `serde::Deserialize` para input e `serde::Serialize` para output.

```rust
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSettingsInput {
    pub output_folder: String,
    pub default_target_mb: u32,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSettingsOutput {
    pub success: bool,
}
```

Preferir `camelCase` para compatibilidade com TypeScript.

---

## Paths

Não confiar em path recebido do frontend.

Exemplo básico:

```rust
use std::path::{Path, PathBuf};

pub fn validate_existing_file(path: &str) -> Result<PathBuf, AppError> {
    let path = Path::new(path);

    if !path.exists() {
        return Err(AppError::FileNotFound(path.display().to_string()));
    }

    if !path.is_file() {
        return Err(AppError::InvalidInput("Path is not a file".into()));
    }

    path.canonicalize()
        .map_err(|err| AppError::Io(format!("Failed to canonicalize path: {err}")))
}
```

Para apps com permissões restritas, alinhar a validação com `capabilities/default.json`.

---

## Async

Use `async` para:

- IO;
- comandos longos;
- processo externo;
- download;
- compressão/conversão;
- scan de diretórios grandes.

Exemplo:

```rust
#[tauri::command]
pub async fn long_task(input: LongTaskInput) -> Result<LongTaskOutput, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        crate::services::heavy_service::run(input)
    })
    .await
    .map_err(|err| AppError::Internal(format!("Task join error: {err}")))?
}
```

Para CPU/processamento bloqueante, considerar `spawn_blocking`.

---

## Estado compartilhado

Usar state gerenciado pelo Tauri quando o app precisa compartilhar estado entre commands.

Exemplo conceitual:

```rust
use std::sync::Mutex;

pub struct AppState {
    pub current_job: Mutex<Option<String>>,
}
```

Registrar no builder:

```rust
.manage(AppState {
    current_job: Mutex::new(None),
})
```

Regra:

- Não usar global mutable state sem necessidade.
- Usar `Mutex`/`RwLock` com cuidado.
- Evitar segurar lock enquanto roda tarefa longa.

---

## Eventos para progresso

Para tarefas longas, emitir eventos para o frontend.

Exemplo conceitual:

```rust
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub job_id: String,
    pub progress: f32,
    pub message: String,
}
```

O command começa a tarefa; o frontend escuta progresso por evento.

Usar eventos para:

- compressão de vídeo;
- conversão;
- download;
- scan;
- importação;
- processamento batch.

---

## Dependências Rust recomendadas

Adicionar só quando necessário.

| Crate | Uso |
|---|---|
| `serde` | input/output tipado |
| `thiserror` | erro central limpo |
| `tokio` | async mais avançado, se necessário |
| `tracing` | logs estruturados |
| `dirs` | diretórios conhecidos do sistema |
| `walkdir` | percorrer diretórios |
| `tempfile` | arquivos temporários/testes |

Antes de adicionar dependência:

1. verificar se `std` resolve;
2. verificar se Tauri/plugin já resolve;
3. preferir crate pequena e mantida;
4. justificar no resumo.

---

## Testes

Services devem ser testáveis sem abrir o app Tauri.

Exemplo:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_zero_target_size() {
        let result = validate_target_mb(0);
        assert!(result.is_err());
    }
}
```

Regra:

- testar validação em `services/`;
- evitar testar UI em Rust;
- separar função pura de IO quando possível.

---

## Checklist antes de concluir mudança Rust

```bash
cd src-tauri
cargo fmt
cargo check
cargo clippy
```

Se alterou lógica testável:

```bash
cargo test
```

Também verificar:

- [ ] nenhum `unwrap()` novo em fluxo normal;
- [ ] input vindo do frontend validado;
- [ ] command tipado com structs;
- [ ] erro retorna `Result<_, AppError>`;
- [ ] lógica pesada fora de `commands/`;
- [ ] permissões Tauri não foram ampliadas sem necessidade;
- [ ] TypeScript do frontend atualizado para o contrato novo.

---

## Prompt curto para o agente

```txt
Use Rust only for native/system/business-sensitive logic. Keep Tauri commands thin, typed, async when needed, and returning Result<Output, AppError>. Put real logic in services, validate all frontend input, avoid unwrap in normal flow, avoid shell string execution, and run cargo fmt/check/clippy before finishing.
```

---

## Referências oficiais

- Rust Book: https://doc.rust-lang.org/book/
- Rust dev tools / clippy / rustfmt: https://doc.rust-lang.org/book/appendix-04-useful-development-tools.html
- Cargo Book: https://doc.rust-lang.org/cargo/
- Tauri v2 — Calling Rust from the frontend: https://v2.tauri.app/develop/calling-rust/
- Tauri v2 — Calling frontend from Rust: https://v2.tauri.app/develop/calling-frontend/
