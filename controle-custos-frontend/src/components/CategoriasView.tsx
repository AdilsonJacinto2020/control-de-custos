import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, AlertCircle, FolderTree } from 'lucide-react';
import { categoriasApi } from '../api/financas';
import { RenderCategoryIcon, AVAILABLE_CATEGORY_ICONS } from './CategoryIcon';
import type { CategoriaItem } from '../types';

interface CategoriasViewProps {
  onCategoriaAlterada?: () => void;
}

export const CategoriasView: React.FC<CategoriasViewProps> = ({ onCategoriaAlterada }) => {
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('utensils');
  const [cor, setCor] = useState('#FF4D2E');
  const [categoriaPaiId, setCategoriaPaiId] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarCategorias();
  }, []);

  async function carregarCategorias() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await categoriasApi.listar();
      setCategorias(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar categorias');
    } finally {
      setCarregando(false);
    }
  }

  async function handleCriarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    setSalvando(true);
    try {
      await categoriasApi.criar({
        nome: nome.trim(),
        icone,
        cor,
        categoriaPaiId: categoriaPaiId || undefined,
      });
      setNome('');
      setCategoriaPaiId('');
      await carregarCategorias();
      onCategoriaAlterada?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar categoria');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(id: string) {
    if (!confirm('Tem a certeza que deseja remover esta categoria?')) return;
    try {
      await categoriasApi.remover(id);
      setCategorias((prev) => prev.filter((c) => c.id !== id));
      onCategoriaAlterada?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover categoria');
    }
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="flex items-center gap-2">
          <FolderTree className="text-primary" size={24} />
          <h2>Gestão de Categorias</h2>
        </div>
        <button onClick={carregarCategorias} className="btn-secondary" title="Atualizar">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="alert-box error">
          <AlertCircle size={18} />
          <span>{erro}</span>
        </div>
      )}

      <div className="grid-2col">
        {/* Formulário de Criação */}
        <section className="card form-card">
          <h3>
            <Plus size={18} className="text-primary" /> Nova Categoria
          </h3>
          <form onSubmit={handleCriarCategoria} className="despesa-form">
            <label>
              Nome da Categoria
              <input
                type="text"
                placeholder="Ex: Supermercado, Combustível, Assinaturas..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </label>

            <label>
              Ícone
              <div className="icone-selector">
                {AVAILABLE_CATEGORY_ICONS.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`icone-option ${icone === item.key ? 'active' : ''}`}
                      onClick={() => setIcone(item.key)}
                      title={item.label}
                    >
                      <IconComp size={18} />
                    </button>
                  );
                })}
              </div>
            </label>

            <div className="form-group-block">
              <label>Cor de Identificação</label>
              <div className="color-palette-picker">
                {[
                  { name: 'Laranja Acento', hex: '#FF4D2E' },
                  { name: 'Azul Técnico', hex: '#0284C7' },
                  { name: 'Verde Esmeralda', hex: '#10B981' },
                  { name: 'Âmbar Dourado', hex: '#F59E0B' },
                  { name: 'Violeta / Roxo', hex: '#8B5CF6' },
                  { name: 'Rosa Vivo', hex: '#EC4899' },
                  { name: 'Vermelho Ruby', hex: '#EF4444' },
                  { name: 'Ciano Claro', hex: '#06B6D4' },
                  { name: 'Lima', hex: '#84CC16' },
                  { name: 'Índigo', hex: '#6366F1' },
                  { name: 'Cinza Ardósia', hex: '#64748B' },
                  { name: 'Grafite Escuro', hex: '#334155' },
                ].map((item) => (
                  <button
                    key={item.hex}
                    type="button"
                    className={`color-swatch-btn ${cor.toLowerCase() === item.hex.toLowerCase() ? 'active' : ''}`}
                    style={{ backgroundColor: item.hex }}
                    onClick={() => setCor(item.hex)}
                    title={item.name}
                  >
                    {cor.toLowerCase() === item.hex.toLowerCase() && (
                      <span className="color-check-mark">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Preview em tempo real da Categoria */}
              <div className="categoria-live-preview">
                <span className="preview-label">Pré-visualização:</span>
                <div
                  className="categoria-badge-preview"
                  style={{
                    backgroundColor: `${cor}15`,
                    borderColor: `${cor}40`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span
                    className="preview-icon-dot"
                    style={{ backgroundColor: `${cor}30`, borderColor: cor, color: cor }}
                  >
                    <RenderCategoryIcon icone={icone} size={14} />
                  </span>
                  <span className="preview-nome font-semibold">{nome.trim() || 'Nome da Categoria'}</span>
                  <span className="preview-hex font-mono">{cor}</span>
                </div>
              </div>
            </div>

            <label>
              Categoria Pai (Opcional - Subcategoria)
              <select
                value={categoriaPaiId}
                onChange={(e) => setCategoriaPaiId(e.target.value)}
              >
                <option value="">Nenhuma (Categoria Principal)</option>
                {categorias
                  .filter((c) => !c.categoriaPaiId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
            </label>

            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Adicionar Categoria'}
            </button>
          </form>
        </section>

        {/* Listagem de Categorias em Grid Limpo */}
        <section className="card list-card">
          <h3>Categorias Cadastradas ({categorias.length})</h3>

          {carregando ? (
            <div className="empty-state">Carregando categorias...</div>
          ) : categorias.length === 0 ? (
            <div className="empty-state">Nenhuma categoria encontrada. Crie a primeira ao lado!</div>
          ) : (
            <div className="categorias-list">
              {categorias.map((c) => (
                <div key={c.id} className="categoria-item-row">
                  <div className="flex items-center gap-3">
                    <span
                      className="categoria-badge-dot"
                      style={{
                        backgroundColor: `${c.cor || '#0284C7'}20`,
                        borderColor: `${c.cor || '#0284C7'}40`,
                        color: c.cor || '#0284C7',
                      }}
                    >
                      <RenderCategoryIcon icone={c.icone} size={18} />
                    </span>
                    <div>
                      <strong className="categoria-nome">{c.nome}</strong>
                      {c.categoriaPaiId && (
                        <span className="text-xs text-muted block">
                          ↳ Subcategoria de:{' '}
                          {categorias.find((p) => p.id === c.categoriaPaiId)?.nome || 'Pai'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemover(c.id)}
                    className="btn-danger-ghost"
                    title="Remover categoria"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
