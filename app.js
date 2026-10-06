(function () {
  const STORAGE_USERS_KEY = 'financapp_usuarios';
  const STORAGE_LANCAMENTOS_KEY = 'financapp_lancamentos';

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('Não foi possível ler o armazenamento local:', error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Não foi possível salvar no armazenamento local:', error);
    }
  }

  function uid() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function ensureDemoUser() {
    const usuarios = readStorage(STORAGE_USERS_KEY, []);
    const jaExiste = usuarios.some(function (item) {
      return String(item.usuario).toLowerCase() === 'demo';
    });

    if (!jaExiste) {
      usuarios.push({
        id: 'demo-user-1',
        nome: 'Demo User',
        turma: 'Premium',
        usuario: 'demo',
        senha: '123456',
        foto_url: ''
      });
      writeStorage(STORAGE_USERS_KEY, usuarios);
    }

    return readStorage(STORAGE_USERS_KEY, []);
  }

  async function cadastrarUsuario(nome, turma, usuario, senha) {
    if (!nome || !turma || !usuario || !senha) {
      return { data: null, error: { message: 'Preencha todos os campos.' } };
    }

    const usuarios = readStorage(STORAGE_USERS_KEY, []);
    const jaExiste = usuarios.some(function (item) {
      return String(item.usuario).toLowerCase() === String(usuario).trim().toLowerCase();
    });

    if (jaExiste) {
      return { data: null, error: { message: 'Usuário já cadastrado.' } };
    }

    const novoUsuario = {
      id: uid(),
      nome: String(nome).trim(),
      turma: String(turma).trim(),
      usuario: String(usuario).trim(),
      senha: String(senha),
      foto_url: ''
    };

    usuarios.push(novoUsuario);
    writeStorage(STORAGE_USERS_KEY, usuarios);

    return { data: novoUsuario, error: null };
  }

  async function fazerLogin(usuario, senha) {
    const usuarios = readStorage(STORAGE_USERS_KEY, []);
    let usuarioEncontrado = usuarios.find(function (item) {
      return String(item.usuario).toLowerCase() === String(usuario).trim().toLowerCase() && String(item.senha) === String(senha);
    });

    if (!usuarioEncontrado && String(usuario).trim().toLowerCase() === 'demo' && String(senha) === '123456') {
      usuarioEncontrado = {
        id: 'demo-user-1',
        nome: 'Demo User',
        turma: 'Premium',
        usuario: 'demo',
        senha: '123456',
        foto_url: ''
      };

      if (!usuarios.some(function (item) { return String(item.usuario).toLowerCase() === 'demo'; })) {
        usuarios.push(usuarioEncontrado);
        writeStorage(STORAGE_USERS_KEY, usuarios);
      }
    }

    if (!usuarioEncontrado) {
      return { data: null, error: { message: 'Usuário ou senha incorretos.' } };
    }

    return { data: usuarioEncontrado, error: null };
  }

  async function criarLancamento(autorId, descricao, valor, tipo, cartao) {
    const valorNumero = Number(valor);

    if (!autorId || !descricao || !valor || Number.isNaN(valorNumero) || valorNumero <= 0) {
      return { data: null, error: { message: 'Dados do lançamento inválidos.' } };
    }

    const lancamentos = readStorage(STORAGE_LANCAMENTOS_KEY, []);
    const novoLancamento = {
      id: uid(),
      autor_id: autorId,
      descricao: String(descricao).trim(),
      valor: valorNumero,
      tipo: String(tipo || 'despesa'),
      cartao: String(cartao || 'Black'),
      tags: [],
      criado_em: new Date().toISOString()
    };

    lancamentos.push(novoLancamento);
    writeStorage(STORAGE_LANCAMENTOS_KEY, lancamentos);

    return { data: novoLancamento, error: null };
  }

  async function carregarLancamentos(autorId) {
    const lancamentos = readStorage(STORAGE_LANCAMENTOS_KEY, []).filter(function (lancamento) {
      return String(lancamento.autor_id) === String(autorId);
    });

    lancamentos.sort(function (a, b) {
      return new Date(b.criado_em) - new Date(a.criado_em);
    });

    return {
      data: lancamentos.map(function (lancamento) {
        return {
          ...lancamento,
          tags: Array.isArray(lancamento.tags) ? lancamento.tags : []
        };
      }),
      error: null
    };
  }

  async function adicionarTag(lancamentoId, nomeTag) {
    const nome = String(nomeTag || '').trim().toLowerCase();

    if (!nome) {
      return { data: null, error: { message: 'Tag vazia.' } };
    }

    const lancamentos = readStorage(STORAGE_LANCAMENTOS_KEY, []);
    const indice = lancamentos.findIndex(function (item) {
      return String(item.id) === String(lancamentoId);
    });

    if (indice === -1) {
      return { data: null, error: { message: 'Lançamento não encontrado.' } };
    }

    const lancamento = lancamentos[indice];
    const tags = Array.isArray(lancamento.tags) ? lancamento.tags : [];

    if (!tags.includes(nome)) {
      tags.push(nome);
      lancamento.tags = tags;
      writeStorage(STORAGE_LANCAMENTOS_KEY, lancamentos);
    }

    return { data: lancamento, error: null };
  }

  if (typeof window !== 'undefined') {
    ensureDemoUser();

    window.financApp = {
      cadastrarUsuario,
      fazerLogin,
      criarLancamento,
      carregarLancamentos,
      adicionarTag,
      uid,
      ensureDemoUser
    };
  }
})();
