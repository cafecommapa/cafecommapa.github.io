# Registro do visual original do blog

Data do registro: 2026-06-29

Este arquivo guarda a referência do visual original do blog antes da aplicação do tema visual novo em 2026-06-29.

## Arquivos do visual original

Os arquivos principais do visual atual do blog são:

- `index.html`
- `css/base.css`
- `css/header.css`
- `css/posts.css`
- `css/responsive.css`
- `css/popups.css`
- `css/mapa.css`

O preview visual foi aplicado aos arquivos reais do site em 2026-06-29. Os arquivos temporários de preview foram removidos para não serem publicados por acidente.

## Identidade visual original

Fonte do corpo:

- `Arial, sans-serif`

Fonte do título:

- `Pacifico`

Cores principais em `css/base.css`:

```css
--cor-fundo:#f6f2ea;
--cor-painel:rgba(255,255,255,0.95);
--cor-borda:#d5c2af;
--cor-borda-suave:#deccba;
--cor-texto:#333333;
--cor-texto-suave:#777777;
--cor-destaque:#8b5e3c;
--cor-destaque-escura:#6e462c;
--cor-destaque-clara:#d2b48c;
--cor-marrom:#5a3c26;
```

Header original em `css/header.css`:

```css
.topo{
  background:linear-gradient(180deg,#e6bf86 0%, #dfb67a 100%);
  border:1px solid #b58c62;
}

.titulo-site{
  color:#4b2e1f;
}

.menu-principal{
  background:rgba(255,255,255,0.9);
}
```

Estilo geral original:

- Paleta quente de bege, marrom e dourado.
- Fundo com mapa.
- Cards claros com borda bege.
- Sensação mais clássica, acolhedora e de diário de viagem.

## Como voltar ao original

Se você quiser desistir da alteração visual:

1. Restaurar as variáveis originais de `css/base.css`.
2. Restaurar o bloco `.topo`, `.titulo-site` e `.menu-principal` de `css/header.css`.
3. Restaurar os ajustes originais de cards, sidebar e faixa de venda em `css/posts.css`.
4. Restaurar as cores mobile originais em `css/responsive.css`.
5. Trocar os links de fonte em `index.html`, `post.html` e `mapa.html` para carregar apenas `Pacifico`, removendo `Inter`.

Se o projeto estiver versionado no Git, o caminho mais seguro é revisar o diff antes de publicar e restaurar apenas os arquivos visuais modificados.
