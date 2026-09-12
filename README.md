# Convocação — App do Time de Futsal

App de presença e gamificação para o time de futsal que joga aos sábados no SENAI.

**Etapa atual:** login por jogador + cartinha estilo FIFA (distribuição de
pontos em atributos), além do checklist de presença e o sorteio de times.
A navegação agora é uma barra fixa embaixo, com 5 abas.

## Como funciona (por enquanto)

**Login e cartinha**
- Cada jogador cria a própria conta (e-mail + senha) na tela inicial.
- Ao criar a conta, o sistema já cria a cartinha dele automaticamente (nome
  vem do que a pessoa digitou, atributos começam em 40, overall também
  calculado automaticamente).
- Na aba **Minha Cartinha**, o jogador logado distribui os pontos que tiver
  disponíveis (`skill_points_available`) entre os 6 atributos (Ritmo,
  Finalização, Passe, Drible, Defesa, Físico). O overall é a média dos 6.
- Por segurança, o banco só deixa cada jogador editar a própria cartinha, e
  só os campos de atributos/pontos — nome, número da camisa e pontos totais
  só um **admin** pode mudar.

**Chamada**
- Na aba **Chamada**, quem estiver logado marca quem veio jogar hoje.
- Ao clicar em "Salvar presença de hoje", o app cria a partida de hoje,
  registra a presença de cada jogador marcado e dá pontos pra cada um deles
  (10 por padrão — dá pra mudar na tabela `matches`, coluna
  `points_per_attendance`).
- **Importante:** como isso mexe nos pontos de várias pessoas de uma vez,
  só um **admin** consegue salvar a chamada com sucesso (ver Passo 1.6
  abaixo pra virar admin).

**Elenco**
- Mostra todos os jogadores. O formulário de cadastro manual e o botão de
  remover só aparecem pra admins — jogadores comuns entram criando a própria
  conta, não precisam ser cadastrados à mão.

Enquanto o Supabase não está configurado, o app roda em **modo de teste**
(sem tela de login), com 5 jogadores de exemplo, só pra você ver a interface
funcionando.

## Passo 1 — Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) (pode entrar com o GitHub).
2. Crie um novo projeto (escolha uma senha de banco e guarde ela em lugar seguro).
3. Depois que o projeto for criado, vá em **SQL Editor** → **New query**.
4. Copie todo o conteúdo do arquivo `supabase/schema.sql` deste projeto, cole
   lá e clique em **Run**. Isso cria as tabelas (`players`, `matches`,
   `attendances`) e as regras de quem pode editar o quê.
5. **(Opcional, mas recomendado)** Vá em **Authentication** → **Providers** →
   **Email**, e desative "Confirm email" — assim os jogadores conseguem
   entrar no app assim que criam a conta, sem precisar confirmar por e-mail.
6. Vá em **Project Settings** → **API** e pegue dois valores:
   - **Project URL**
   - **anon public key**
7. **Depois de você mesmo criar sua conta pelo app** (Passo 2 abaixo), volte
   aqui no Supabase, em **Table Editor** → tabela `players`, encontre a sua
   linha e marque `is_admin` como `true`. Isso te torna o administrador —
   só assim você consegue salvar a chamada e gerenciar o elenco.

## Passo 2 — Rodar o app na sua máquina

```bash
npm install
cp .env.example .env
```

Abra o `.env` e cole os valores do Supabase:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Depois:

```bash
npm run dev
```

Abra o endereço que aparecer no terminal (geralmente `http://localhost:5173`).

## Passo 3 — Subir pro GitHub

```bash
git init
git add .
git commit -m "Primeira versão: checklist de presença"
```

Crie um repositório novo no GitHub (pode deixar público, como você fez no
Hub) e siga as instruções que o próprio GitHub mostra pra "empurrar" um
projeto já existente (`git remote add origin ...` e `git push`).

## Passo 4 — Publicar na Vercel

1. Entre em [vercel.com](https://vercel.com) com sua conta do GitHub.
2. Clique em **Add New → Project** e escolha o repositório que você acabou
   de criar.
3. Antes de clicar em "Deploy", abra **Environment Variables** e adicione as
   mesmas duas chaves do seu `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**. Em cerca de 1 minuto o app estará no ar, acessível
   de qualquer celular ou computador pelo link que a Vercel gerar.

A partir daí, todo `git push` no repositório atualiza o site automaticamente
— igual já funciona no SENAI Hub.

**Sorteio**
- Pega quem confirmou presença hoje (na Chamada) e sorteia dois times
  aleatoriamente. Você escolhe quantos jogadores por time (o app já sugere
  metade do total confirmado); quem sobra fica como reserva.
- Mostra o OVR médio de cada time (baseado no overall de cada jogador) —
  não é balanceado por força, é sorteio mesmo, só pra deixar visível a força
  de cada lado depois de sortear.

## O que falta pra próxima etapa

- Nada planejado ainda — ideias futuras: balancear o sorteio por força dos
  times, guardar o histórico de sorteios anteriores.
