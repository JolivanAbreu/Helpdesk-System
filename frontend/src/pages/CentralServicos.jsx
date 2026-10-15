// src/pages/CentralServicos.jsx
// Página principal para abrir chamados: busca inteligente no topo e as
// categorias do catálogo em cards. Clicar num card abre as subcategorias;
// escolher uma leva ao formulário (AbrirChamado).
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowRight, Inbox } from "lucide-react";
import api, { isEquipe } from "../services/api";
import { iconeCategoria } from "../config/dominio";
import { codigoChamado, tempoRelativo } from "../utils/formatar";
import { useCatalogo } from "../hooks/useCatalogo";
import BuscaServicos from "../components/BuscaServicos";
import SubcategoriasModal from "../components/SubcategoriasModal";
import { StatusSelo } from "../components/ui/Selos";
import { Esqueleto } from "../components/ui/Estados";
import { PrazoTexto } from "../components/ui/Prazo";

export default function CentralServicos() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { catalogo, carregando, erro } = useCatalogo();
  const [aberta, setAberta] = useState(null); // categoria com o modal aberto
  const primeiroNome = user?.nome?.split(" ")[0];

  // "Outros › Outros assuntos" para quando a busca não encontra nada
  function abrirEmOutros(titulo) {
    const outros = catalogo.find((c) => c.icone === "outros")?.subcategorias[0] ?? catalogo.at(-1)?.subcategorias[0];
    if (outros) navigate(`/abrir/${outros.id}`, { state: { titulo } });
  }

  return (
    <>
      <section
        className="relative -mt-2 overflow-visible rounded-xl bg-marinho px-5 py-8 sm:px-10 sm:py-10"
        style={{ backgroundImage: "radial-gradient(circle at 85% 0%, rgba(31,95,173,0.55), transparent 55%)" }}
        aria-labelledby="titulo-central"
      >
        <p className="text-sm font-medium text-white/70">Central de serviços</p>
        <h1 id="titulo-central" className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Como podemos ajudar{primeiroNome ? `, ${primeiroNome}` : ""}?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Descreva o problema com suas palavras ou escolha uma categoria. A prioridade e a equipe que atende são definidas automaticamente.
        </p>
        <div className="mt-6 max-w-3xl">
          <BuscaServicos catalogo={catalogo} onVerOutros={abrirEmOutros} />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="titulo-categorias">
        <h2 id="titulo-categorias" className="text-lg font-semibold">Categorias</h2>
        {carregando ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Carregando categorias">
            {Array.from({ length: 6 }, (_, i) => <Esqueleto key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : erro ? (
          <p className="mt-4 text-sm text-prioridade-critica">Não foi possível carregar o catálogo. Atualize a página para tentar de novo.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalogo.filter((c) => c.subcategorias.length).map((c) => (
              <li key={c.id}>
                <CardCategoria categoria={c} onAbrir={() => setAberta(c)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isEquipe(user) && <MeusPendentes />}

      {aberta && <SubcategoriasModal categoria={aberta} onFechar={() => setAberta(null)} />}
    </>
  );
}

function CardCategoria({ categoria, onAbrir }) {
  const Icone = iconeCategoria(categoria.icone);
  const subs = categoria.subcategorias.map((s) => s.nome);
  const visiveis = subs.slice(0, 3);
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`${categoria.nome}: ${subs.length} ${subs.length === 1 ? "opção" : "opções"}${categoria.descricao ? `. ${categoria.descricao}` : ""}`}
      className="group flex h-full w-full flex-col rounded-lg border border-borda bg-white p-5 text-left shadow-painel transition hover:-translate-y-0.5 hover:border-azul/60 hover:shadow-flutuante focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul"
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-azul-claro text-azul transition-colors group-hover:bg-azul group-hover:text-white">
          <Icone className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-nevoa px-2 py-0.5 text-xs text-aco">
          {subs.length} {subs.length === 1 ? "opção" : "opções"}
        </span>
      </span>
      <span className="mt-4 text-base font-semibold text-marinho">{categoria.nome}</span>
      {categoria.descricao && <span className="mt-1 text-sm text-aco">{categoria.descricao}</span>}
      <span className="mt-4 flex flex-1 items-end justify-between gap-3 border-t border-borda pt-3 text-xs text-aco">
        <span className="line-clamp-1">
          {visiveis.join(" · ")}
          {subs.length > visiveis.length ? ` · +${subs.length - visiveis.length}` : ""}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-azul transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </button>
  );
}

// Chamados do colaborador que ainda estão em aberto
function MeusPendentes() {
  const [chamados, setChamados] = useState(null);

  useEffect(() => {
    api.get("/chamados", { params: { status: "aberto,em andamento", ordem: "atualizados", porPagina: 3 } })
      .then(({ data }) => setChamados(data))
      .catch(() => setChamados({ dados: [], total: 0 }));
  }, []);

  if (!chamados || !chamados.total) return null;

  return (
    <section className="mt-10" aria-labelledby="titulo-pendentes">
      <div className="flex items-center justify-between gap-4">
        <h2 id="titulo-pendentes" className="flex items-center gap-2 text-lg font-semibold">
          <Inbox className="h-5 w-5 text-aco" aria-hidden="true" />
          Seus chamados em aberto
        </h2>
        <Link to="/chamados" className="text-sm font-medium text-azul hover:underline">
          Ver todos ({chamados.total})
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {chamados.dados.map((c) => (
          <li key={c.id} className="relative rounded-lg border border-borda bg-white p-4 shadow-painel hover:border-azul/50">
            <p className="flex items-center justify-between gap-2 text-xs text-aco">
              <span className="num">{codigoChamado(c.id)}</span>
              <StatusSelo status={c.status} />
            </p>
            <Link to={`/chamado/${c.id}`} className="mt-2 line-clamp-2 block font-medium text-marinho after:absolute after:inset-0">
              {c.titulo}
            </Link>
            <p className="mt-3 flex items-center justify-between gap-2 text-xs text-aco">
              <span>Atualizado {tempoRelativo(c.updatedAt)}</span>
              <PrazoTexto sla={c.sla.solucao} />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
