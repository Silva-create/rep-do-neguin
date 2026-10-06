(function () {
  let usuarioLogado = null;

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function getTipoLabel(tipo) {
    const mapa = {
      receita: 'Receita',
      despesa: 'Despesa'
    };
    return mapa[String(tipo)] || 'Movimentação';
  }

  function getTipoClass(tipo) {
    if (tipo === 'receita') return 'receita';
    return 'despesa';
  }

  function mostrarPerfil(usuario) {
    const nomeEl = document.getElementById('perfilNome');
    const turmaEl = document.getElementById('perfilTurma');
    const fotoEl = document.getElementById('perfilFoto');

    if (!usuario) {
      return;
    }

    if (nomeEl) nomeEl.textContent = usuario.nome || '';
    if (turmaEl) turmaEl.textContent = usuario.turma || '';
    if (fotoEl && usuario.foto_url) {
      fotoEl.src = usuario.foto_url;
    }
  }

  function renderLancamento(lancamento) {
    const card = document.createElement('div');
    card.className = 'lancamento-card';

    const descricao = document.createElement('p');
    descricao.className = 'lancamento-desc';
    descricao.textContent = `${lancamento.descricao} · ${getTipoLabel(lancamento.tipo)}`;

    const data = document.createElement('span');
    data.className = 'lancamento-data';
    data.textContent = new Date(lancamento.criado_em).toLocaleDateString('pt-BR');

    const valor = document.createElement('span');
    valor.className = 'lancamento-valor ' + getTipoClass(lancamento.tipo);
    const sinal = lancamento.tipo === 'receita' ? '+' : '-';
    valor.textContent = `${sinal} ${formatarMoeda(Number(lancamento.valor))}`;

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'lancamento-tags';

    (lancamento.tags || []).forEach(function (tag) {
      const badge = document.createElement('span');
      badge.className = 'tag-badge';
      badge.textContent = tag;
      tagsDiv.appendChild(badge);
    });

    card.appendChild(descricao);
    card.appendChild(data);
    card.appendChild(valor);
    card.appendChild(tagsDiv);

    return card;
  }

  function atualizarResumoFinanceiro(lancamentos) {
    const receitasEl = document.getElementById('resumoReceitas');
    const despesasEl = document.getElementById('resumoDespesas');
    const metaEl = document.getElementById('resumoMeta');

    if (!lancamentos) return;

    const receitas = lancamentos
      .filter(function (item) { return item.tipo === 'receita'; })
      .reduce(function (total, item) { return total + Number(item.valor || 0); }, 0);

    const despesas = lancamentos
      .filter(function (item) { return item.tipo === 'despesa'; })
      .reduce(function (total, item) { return total + Number(item.valor || 0); }, 0);

    if (receitasEl) receitasEl.textContent = formatarMoeda(receitas);
    if (despesasEl) despesasEl.textContent = formatarMoeda(despesas);
    if (metaEl) {
      const percentual = Math.min(100, Math.max(0, Math.round((receitas / Math.max(despesas || receitas, 1)) * 100)));
      metaEl.textContent = `${percentual}%`;
    }
  }

  function resumirPeriodo(lancamentos, inicio, fim) {
    return (lancamentos || []).reduce(function (resumo, lancamento) {
      const data = new Date(lancamento.criado_em);
      if (Number.isNaN(data.getTime()) || data < inicio || data > fim) return resumo;

      const valor = Number(lancamento.valor || 0);
      if (lancamento.tipo === 'receita') {
        resumo.receitas += valor;
      } else if (lancamento.tipo === 'despesa') {
        resumo.despesas += valor;
      }

      resumo.saldo = resumo.receitas - resumo.despesas;
      return resumo;
    }, { receitas: 0, despesas: 0, saldo: 0 });
  }

  function atualizarRelatorio(lancamentos, prefixo, inicio, fim, inicioAnterior, fimAnterior) {
    const atual = resumirPeriodo(lancamentos, inicio, fim);
    const anterior = resumirPeriodo(lancamentos, inicioAnterior, fimAnterior);
    const dataFormatada = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
    const periodo = document.getElementById(prefixo + 'Periodo');
    const receitas = document.getElementById(prefixo + 'Receitas');
    const despesas = document.getElementById(prefixo + 'Despesas');
    const saldo = document.getElementById(prefixo + 'Saldo');
    const comparacao = document.getElementById(prefixo + 'Comparacao');

    if (periodo) periodo.textContent = `${dataFormatada.format(inicio)} a ${dataFormatada.format(fim)}`;
    if (receitas) receitas.textContent = formatarMoeda(atual.receitas);
    if (despesas) despesas.textContent = formatarMoeda(atual.despesas);
    if (saldo) {
      saldo.textContent = formatarMoeda(atual.saldo);
      saldo.classList.toggle('positivo', atual.saldo >= 0);
      saldo.classList.toggle('negativo', atual.saldo < 0);
    }

    if (comparacao) {
      const diferencaGastos = atual.despesas - anterior.despesas;
      if (diferencaGastos > 0) {
        comparacao.textContent = `Você gastou ${formatarMoeda(diferencaGastos)} a mais que no período anterior.`;
      } else if (diferencaGastos < 0) {
        comparacao.textContent = `Você gastou ${formatarMoeda(Math.abs(diferencaGastos))} a menos que no período anterior.`;
      } else {
        comparacao.textContent = 'Seus gastos ficaram iguais aos do período anterior.';
      }
    }
  }

  function atualizarRelatorios(lancamentos) {
    const agora = new Date();
    const inicioSemana = new Date(agora);
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7));

    const inicioSemanaAnterior = new Date(inicioSemana);
    inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);
    const fimSemanaAnterior = new Date(inicioSemanaAnterior);
    fimSemanaAnterior.setDate(fimSemanaAnterior.getDate() + ((agora.getDay() + 6) % 7));
    fimSemanaAnterior.setHours(agora.getHours(), agora.getMinutes(), agora.getSeconds(), agora.getMilliseconds());

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0).getDate();
    const diaComparavel = Math.min(agora.getDate(), ultimoDiaMesAnterior);
    const fimMesAnterior = new Date(inicioMesAnterior);
    fimMesAnterior.setDate(diaComparavel);
    fimMesAnterior.setHours(agora.getHours(), agora.getMinutes(), agora.getSeconds(), agora.getMilliseconds());

    atualizarRelatorio(lancamentos, 'relatorioSemana', inicioSemana, agora, inicioSemanaAnterior, fimSemanaAnterior);
    atualizarRelatorio(lancamentos, 'relatorioMes', inicioMes, agora, inicioMesAnterior, fimMesAnterior);
  }

  let tipoFiltroAtual = 'all';
  let cartaoFiltroAtual = 'all';
  let mesFiltroAtual = 'all';

  function inferirCategoria(lancamento) {
    const texto = `${lancamento.descricao || ''} ${(lancamento.tags || []).join(' ')}`.toLowerCase();

    if (/(salario|renda|freela|venda|bonus|receita|adicional)/.test(texto)) return 'Receitas';
    if (/(mercado|supermercado|aliment|comida|restaurante|pizza|padaria|cafe)/.test(texto)) return 'Alimentação';
    if (/(carro|uber|transporte|onibus|combust|gasolina|metro|taxi)/.test(texto)) return 'Transporte';
    if (/(aluguel|casa|luz|agua|condominio|internet|moradia|conta)/.test(texto)) return 'Casa';
    if (/(saude|farmacia|medico|clinica|remedio)/.test(texto)) return 'Saúde';
    if (/(viagem|lazer|cinema|show|hotel|turismo|parque)/.test(texto)) return 'Lazer';
    if (/(vestuario|shop|loja|beleza|presentes)/.test(texto)) return 'Compras';
    return 'Outros';
  }

  function renderCategoriaChart(lancamentos) {
    const container = document.getElementById('categoriaChart');
    if (!container) return;

    const categorias = {};
    (lancamentos || []).forEach(function (item) {
      if (item.tipo !== 'despesa') return;
      const categoria = inferirCategoria(item);
      categorias[categoria] = (categorias[categoria] || 0) + Number(item.valor || 0);
    });

    const entradas = Object.entries(categorias).sort(function (a, b) {
      return b[1] - a[1];
    }).slice(0, 4);

    const maxValor = entradas.length ? Math.max(...entradas.map(function ([, valor]) { return valor; })) : 1;
    container.innerHTML = '';

    if (!entradas.length) {
      const vazio = document.createElement('div');
      vazio.className = 'metric-box';
      vazio.innerHTML = '<span>Categoria</span><strong>Sem gastos</strong>';
      container.appendChild(vazio);
      return;
    }

    entradas.forEach(function ([nome, valor]) {
      const col = document.createElement('div');
      col.className = 'category-bar';
      const bar = document.createElement('div');
      bar.className = 'category-bar-fill';
      bar.style.height = Math.max(16, (valor / maxValor) * 100) + '%';
      const label = document.createElement('span');
      label.textContent = nome;
      const total = document.createElement('strong');
      total.style.fontSize = '0.7rem';
      total.style.color = '#edf5fb';
      total.textContent = formatarMoeda(valor);
      col.appendChild(bar);
      col.appendChild(total);
      col.appendChild(label);
      container.appendChild(col);
    });
  }

  function filtroPorMes(lancamento, mes) {
    if (mes === 'all') return true;
    const data = new Date(lancamento.criado_em || new Date());
    return String(data.getMonth()) === String(mes);
  }

  async function atualizarExtrato(filtro = tipoFiltroAtual, cartaoFiltro = cartaoFiltroAtual, mesFiltro = mesFiltroAtual) {
    const extratoContainer = document.getElementById('extratoContainer');
    const saldoValor = document.getElementById('saldoValor');

    tipoFiltroAtual = filtro;
    cartaoFiltroAtual = cartaoFiltro;
    mesFiltroAtual = mesFiltro;

    if (!usuarioLogado || !extratoContainer) {
      return;
    }

    const resultado = await window.financApp.carregarLancamentos(usuarioLogado.id);
    extratoContainer.innerHTML = '';

    if (resultado.error) {
      extratoContainer.textContent = 'Erro ao carregar o extrato.';
      return;
    }

    const origem = resultado.data || [];
    const filtrados = origem.filter(function (lancamento) {
      const atendeTipo = filtro === 'all' || lancamento.tipo === filtro;
      const atendeCartao = cartaoFiltro === 'all' || String(lancamento.cartao || 'Black') === String(cartaoFiltro);
      const atendeMes = filtroPorMes(lancamento, mesFiltro);
      return atendeTipo && atendeCartao && atendeMes;
    });

    atualizarResumoFinanceiro(origem);
    atualizarRelatorios(origem);
    atualizarCartaoSelecionado(selectedCard, origem);
    renderCategoriaChart(origem.filter(function (item) {
      return filtroPorMes(item, mesFiltro) && (cartaoFiltro === 'all' || String(item.cartao || 'Black') === String(cartaoFiltro));
    }));

    let saldo = 0;
    filtrados.forEach(function (lancamento) {
      extratoContainer.appendChild(renderLancamento(lancamento));
      saldo += lancamento.tipo === 'receita' ? Number(lancamento.valor) : -Number(lancamento.valor);
    });

    if (saldoValor) {
      saldoValor.textContent = formatarMoeda(saldo);
      saldoValor.classList.toggle('positivo', saldo >= 0);
      saldoValor.classList.toggle('negativo', saldo < 0);
    }
  }

  function limparSessao() {
    usuarioLogado = null;
    sessionStorage.removeItem('financapp_usuario');
    const telaApp = document.getElementById('telaApp');
    const telaAuth = document.getElementById('telaAuth');
    const btnSair = document.getElementById('btnSair');

    if (telaApp) telaApp.hidden = true;
    if (telaAuth) telaAuth.hidden = false;
    if (btnSair) btnSair.hidden = true;
  }

  const cartoes = document.querySelectorAll('.virtual-card');
  const cardData = {
    Black: {
      name: 'Black',
      number: '•••• 2560',
      holder: 'Marcos Silva',
      expiry: '09/29',
      brand: 'Aguiar',
      limit: 25000
    },
    Travel: {
      name: 'Travel',
      number: '•••• 8821',
      holder: 'Marcos Silva',
      expiry: '11/27',
      brand: 'Aguiar',
      limit: 18000
    },
    Business: {
      name: 'Business',
      number: '•••• 1034',
      holder: 'Marcos Silva',
      expiry: '08/30',
      brand: 'Aguiar',
      limit: 32000
    }
  };

  let selectedCard = 'Black';

  function getSelectedCardStatus(cardName, listaLancamentos) {
    const dados = cardData[cardName] || cardData.Black;
    const gastos = (listaLancamentos || []).filter(function (item) {
      return String(item.cartao || 'Black') === String(cardName) && item.tipo === 'despesa';
    });

    const totalGasto = gastos.reduce(function (total, item) {
      return total + Number(item.valor || 0);
    }, 0);

    return {
      dados,
      totalGasto,
      disponivel: Math.max(0, Number(dados.limit || 0) - totalGasto),
      gastosRecentes: gastos.slice(0, 4)
    };
  }

  function renderCardRecentList(cardName, listaLancamentos) {
    const listEl = document.getElementById('cardRecentList');
    if (!listEl) return;

    const status = getSelectedCardStatus(cardName, listaLancamentos);
    const itens = status.gastosRecentes.length ? status.gastosRecentes : [{ descricao: 'Sem gastos ainda', valor: 0 }];

    listEl.innerHTML = '';

    itens.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'metric-box';
      row.innerHTML = '<span>' + (item.descricao || 'Gasto') + '</span><strong>' + formatarMoeda(Number(item.valor || 0)) + '</strong>';
      listEl.appendChild(row);
    });
  }

  function atualizarCartaoSelecionado(nome, listaLancamentos) {
    const dados = cardData[nome] || cardData.Black;
    const cardBrand = document.getElementById('cardBrand');
    const cardNumber = document.getElementById('cardNumber');
    const cardHolder = document.getElementById('cardHolder');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardType = document.getElementById('cardType');
    const cardSpent = document.getElementById('cardSpent');
    const cardAvailable = document.getElementById('cardAvailable');
    const cardRecentLabel = document.getElementById('cardRecentLabel');

    const status = getSelectedCardStatus(nome, listaLancamentos || []);

    if (cardBrand) cardBrand.textContent = dados.brand;
    if (cardNumber) cardNumber.textContent = dados.number;
    if (cardHolder) cardHolder.textContent = dados.holder;
    if (cardExpiry) cardExpiry.textContent = dados.expiry;
    if (cardType) cardType.textContent = dados.name;
    if (cardSpent) cardSpent.textContent = formatarMoeda(status.totalGasto);
    if (cardAvailable) cardAvailable.textContent = formatarMoeda(status.disponivel);
    if (cardRecentLabel) cardRecentLabel.textContent = dados.name;

    renderCardRecentList(nome, listaLancamentos || []);
  }

  const filtroCartao = document.getElementById('filtroCartao');

  cartoes.forEach(function (cartao) {
    cartao.addEventListener('click', function () {
      selectedCard = cartao.dataset.card || 'Black';
      cartaoFiltroAtual = selectedCard;
      if (filtroCartao) {
        filtroCartao.value = selectedCard;
      }
      cartoes.forEach(function (item) {
        item.classList.toggle('active', item === cartao);
      });
      const lancamentos = document.getElementById('extratoContainer') && usuarioLogado ? window.financApp ? window.financApp.carregarLancamentos(usuarioLogado.id) : Promise.resolve({ data: [] }) : Promise.resolve({ data: [] });
      lancamentos.then(function (resultado) {
        atualizarCartaoSelecionado(selectedCard, resultado.data || []);
        atualizarExtrato(tipoFiltroAtual, selectedCard, mesFiltroAtual);
      });
    });
  });

  atualizarCartaoSelecionado('Black', []);

  const formCadastro = document.getElementById('formCadastro');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nome = document.getElementById('cadNome').value.trim();
      const turma = document.getElementById('cadTurma').value.trim();
      const usuario = document.getElementById('cadUsuario').value.trim();
      const senha = document.getElementById('cadSenha').value;
      const msg = document.getElementById('cadMsg');

      if (!nome || !turma || !usuario || !senha) {
        msg.textContent = 'Preencha todos os campos.';
        return;
      }

      const resultado = await window.financApp.cadastrarUsuario(nome, turma, usuario, senha);
      if (resultado.error) {
        msg.textContent = resultado.error.message || 'Erro ao cadastrar.';
        return;
      }

      msg.textContent = 'Conta criada! Faça login abaixo.';
      painelCadastro.classList.remove('visible');
      if (btnAbrirCadastro) btnAbrirCadastro.textContent = 'Cadastrar';
      e.target.reset();
    });
  }

  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();

      const usuario = document.getElementById('loginUsuario').value.trim();
      const senha = document.getElementById('loginSenha').value;
      const msg = document.getElementById('loginMsg');

      const resultado = await window.financApp.fazerLogin(usuario, senha);
      if (resultado.error) {
        msg.textContent = resultado.error.message || 'Usuário ou senha incorretos.';
        return;
      }

      usuarioLogado = resultado.data;
      sessionStorage.setItem('financapp_usuario', JSON.stringify(usuarioLogado));

      document.getElementById('telaAuth').hidden = true;
      document.getElementById('telaApp').hidden = false;
      document.getElementById('btnSair').hidden = false;

      const cartaoPadrao = document.getElementById('lancCartao');
      if (cartaoPadrao) cartaoPadrao.value = selectedCard;

      mostrarPerfil(usuarioLogado);
      await atualizarExtrato();
    });
  }

  const btnSair = document.getElementById('btnSair');
  if (btnSair) {
    btnSair.addEventListener('click', function () {
      limparSessao();
    });
  }

  const btnAbrirCadastro = document.getElementById('btnAbrirCadastro');
  const painelCadastro = document.getElementById('painelCadastro');
  if (btnAbrirCadastro && painelCadastro) {
    btnAbrirCadastro.addEventListener('click', function () {
      const mostrando = painelCadastro.classList.toggle('visible');
      btnAbrirCadastro.textContent = mostrando ? 'Fechar cadastro' : 'Cadastrar';

      if (mostrando) {
        painelCadastro.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  const formLancamento = document.getElementById('formLancamento');
  if (formLancamento) {
    formLancamento.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!usuarioLogado) {
        return;
      }

      const descricao = document.getElementById('lancDescricao').value.trim();
      const valor = document.getElementById('lancValor').value;
      const tipo = document.getElementById('lancTipo').value;
      const cartao = document.getElementById('lancCartao').value || selectedCard;
      const tagsTexto = document.getElementById('lancTags').value;

      if (!descricao || !valor) {
        return;
      }

      const resultado = await window.financApp.criarLancamento(usuarioLogado.id, descricao, valor, tipo, cartao);
      if (resultado.error) {
        return;
      }

      const tags = tagsTexto.split(',').map(function (tag) {
        return tag.trim();
      }).filter(Boolean);

      for (const tag of tags) {
        await window.financApp.adicionarTag(resultado.data.id, tag);
      }

      e.target.reset();
      await atualizarExtrato();
    });
  }

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach(function (item) {
        item.classList.toggle('active', item === chip);
      });
      atualizarExtrato(chip.dataset.filter || 'all', cartaoFiltroAtual, mesFiltroAtual);
    });
  });

  const filtroMes = document.getElementById('filtroMes');
  if (filtroMes) {
    filtroMes.addEventListener('change', function () {
      mesFiltroAtual = this.value || 'all';
      atualizarExtrato(tipoFiltroAtual, cartaoFiltroAtual, mesFiltroAtual);
    });
  }

  if (filtroCartao) {
    filtroCartao.addEventListener('change', function () {
      cartaoFiltroAtual = this.value || 'all';
      if (cartaoFiltroAtual !== 'all') {
        selectedCard = cartaoFiltroAtual;
      }
      atualizarExtrato(tipoFiltroAtual, cartaoFiltroAtual, mesFiltroAtual);
    });
  }

  const usuarioSalvo = sessionStorage.getItem('financapp_usuario');
  if (usuarioSalvo) {
    try {
      usuarioLogado = JSON.parse(usuarioSalvo);
      document.getElementById('telaAuth').hidden = true;
      document.getElementById('telaApp').hidden = false;
      document.getElementById('btnSair').hidden = false;
      mostrarPerfil(usuarioLogado);
      atualizarExtrato();
    } catch (error) {
      limparSessao();
    }
  }
})();

