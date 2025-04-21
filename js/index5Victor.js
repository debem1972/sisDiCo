// Configuração do IndexedDB
const DB_NAME = 'sisDiCoDb';
const DB_VERSION = 1;
const STORE_NAME = 'materias';

class DatabaseService {
    constructor() {
        this.db = null;
        this.initDb();
    }

    initDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                reject('Erro ao abrir o banco de dados: ' + event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('titulo', 'titulo', { unique: true });
                }
            };
        });
    }

    async getDb() {
        if (this.db) return this.db;
        return await this.initDb();
    }

    async salvarMateria(materia) {
        if (materia.aulas) {
            materia.aulas.sort((a, b) => {
                const numA = this.extrairNumeroAula(a.titulo);
                const numB = this.extrairNumeroAula(b.titulo);
                return numA - numB;
            });
        }

        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(materia);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Função auxiliar para extrair número da aula
    extrairNumeroAula(titulo) {
        const match = titulo.match(/Aula\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
    }

    async getAllMaterias() {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                // Ordena as matérias alfabeticamente
                const materiasOrdenadas = request.result.sort((a, b) =>
                    a.titulo.localeCompare(b.titulo)
                );

                // Ordena as aulas de cada matéria
                materiasOrdenadas.forEach(materia => {
                    if (materia.aulas) {
                        materia.aulas.sort((a, b) => {
                            const numA = this.extrairNumeroAula(a.titulo);
                            const numB = this.extrairNumeroAula(b.titulo);
                            return numA - numB;
                        });
                    }
                });

                resolve(materiasOrdenadas);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getMateriaByTitulo(titulo) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('titulo');
            const request = index.get(titulo);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteMateria(id) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateMateria(materia) {
        return this.salvarMateria(materia);
    }
}

// Inicialização das variáveis globais
const dbService = new DatabaseService();
const materiaInput = document.getElementById('materia-input');
const aulaInput = document.getElementById('aula-input');
const conteudoInput = document.getElementById('conteudo-aula');
const lancarBtn = document.getElementById('lancar-btn');
const contentList = document.getElementById('content-list');
const searchInput = document.getElementById('search-input');
const materiasDatalist = document.getElementById('materias-list');
const aulasDatalist = document.getElementById('aulas-list');
const exportarBtn = document.getElementById('exportar-btn');
const importarBtn = document.getElementById('importar-btn');
const importFile = document.getElementById('import-file');
const alertElement = document.getElementById('alert');
const loadingElement = document.getElementById('loading');

// Funções auxiliares
function showAlert(message, type = 'success', duration = 10000) {
    alertElement.textContent = message;
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.style.display = 'block';
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, duration);
}

function toggleLoading(show) {
    loadingElement.style.display = show ? 'flex' : 'none';
}

function gerarIdAleatorio() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) { // Corrigido: i < 6
        id += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return id;
}

function extrairNumeroDaAula(titulo) {
    const numeros = titulo.match(/\d+/g);
    return numeros ? parseInt(numeros.join(''), 10) : 0;
}

// Função para criar elemento de matéria
function criarElementoMateria(materia) {
    const materiaElement = document.createElement('li');
    materiaElement.className = 'materia-item';
    materiaElement.dataset.id = materia.id;

    const materiaHeader = document.createElement('div');
    materiaHeader.innerHTML = `
        <span class="materia-titulo">${materia.titulo}</span>
        <button class="btn btn-sm btn-outline-danger edit-btn">Excluir</button>
        <button class="btn btn-sm btn-outline-primary edit-btn">Editar</button>
    `;

    const aulasList = document.createElement('ul');
    aulasList.className = 'aula-list';

    if (materia.aulas && materia.aulas.length > 0) {
        materia.aulas.sort((a, b) => extrairNumeroDaAula(a.titulo) - extrairNumeroDaAula(b.titulo));
        aulasList.innerHTML = "";
        materia.aulas.forEach(aula => {
            aulasList.appendChild(criarElementoAula(aula, materia));
        });
    }

    materiaElement.appendChild(materiaHeader);
    materiaElement.appendChild(aulasList);

    materiaHeader.addEventListener('click', (e) => {
        if (!e.target.classList.contains('edit-btn')) {
            if (searchInput.value.trim() === '') {
                aulasList.classList.toggle('show');
                if (aulasList.classList.contains('show')) {
                    aulasList.classList.add('slide-down');
                }
            }
        }
    });

    const editBtn = materiaHeader.querySelector('.btn-outline-primary');
    editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const novoTitulo = prompt('Digite o novo título da matéria:', materia.titulo);
        if (novoTitulo && novoTitulo !== materia.titulo) {
            try {
                materia.titulo = novoTitulo;
                await dbService.updateMateria(materia);
                materiaHeader.querySelector('.materia-titulo').textContent = novoTitulo;
                showAlert('Matéria atualizada com sucesso!');
            } catch (error) {
                showAlert('Erro ao atualizar matéria: ' + error, 'danger');
            }
        }
    });

    const deleteBtn = materiaHeader.querySelector('.btn-outline-danger');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir esta matéria e todas as suas aulas?')) {
            try {
                await dbService.deleteMateria(materia.id);
                materiaElement.remove();
                showAlert('Matéria excluída com sucesso!');
            } catch (error) {
                showAlert('Erro ao excluir matéria: ' + error, 'danger');
            }
        }
    });

    return materiaElement;
}

async function salvarMateriaOrdenada(materia) {
    if (materia.aulas) {
        materia.aulas.sort((a, b) => extrairNumeroDaAula(a.titulo) - extrairNumeroDaAula(b.titulo));
    }
    await dbService.salvarMateria(materia);
}

// Função para criar elemento de aula
function criarElementoAula(aulaObj, materia) {
    const aulaItem = document.createElement('li');
    aulaItem.className = 'aula-item';
    aulaItem.dataset.id = aulaObj.id;

    aulaItem.innerHTML = `
        <a href="#${aulaObj.id}" class="aula-link" data-expressao="">🔗 ${aulaObj.titulo}</a>
        <span class="aula-titulo">${aulaObj.titulo}</span>
        <button class="btn btn-sm btn-outline-danger edit-btn">Excluir</button>
        <button class="btn btn-sm btn-outline-primary edit-btn">Editar</button>
    `;

    const aulaLink = aulaItem.querySelector('.aula-link');
    aulaLink.addEventListener('click', (e) => {
        e.preventDefault();
        const expressao = aulaLink.dataset.expressao || '';
        destacarExpressaoNaAula(aulaObj.id, expressao);
    });

    const editBtn = aulaItem.querySelector('.btn-outline-primary');
    editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const novoTitulo = prompt('Digite o novo título da aula:', aulaObj.titulo);
        const novoConteudo = prompt('Digite o resumo da aula:', aulaObj.conteudo || '');
        try {
            const index = materia.aulas.findIndex(a => a.id === aulaObj.id);
            let atualizado = false;

            if (novoTitulo && novoTitulo !== aulaObj.titulo) {
                materia.aulas[index].titulo = novoTitulo;
                atualizado = true;
            }
            if (novoConteudo !== null && novoConteudo !== (aulaObj.conteudo || '')) {
                materia.aulas[index].conteudo = novoConteudo;
                atualizado = true;
            }

            if (atualizado) {
                await dbService.updateMateria(materia);
                aulaItem.querySelector('.aula-titulo').textContent = novoTitulo || aulaObj.titulo;
                showAlert('Aula atualizada com sucesso!');
            }
        } catch (error) {
            showAlert('Erro ao atualizar aula: ' + error, 'danger');
        }
    });

    const deleteBtn = aulaItem.querySelector('.btn-outline-danger');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir esta aula?')) {
            try {
                const index = materia.aulas.findIndex(a => a.id === aulaObj.id);
                materia.aulas.splice(index, 1);
                await dbService.updateMateria(materia);
                aulaItem.remove();
                showAlert('Aula excluída com sucesso!');
            } catch (error) {
                showAlert('Erro ao excluir aula: ' + error, 'danger');
            }
        }
    });

    return aulaItem;
}

// Função para destacar expressão na div.aula
function destacarExpressaoNaAula(aulaId, expressao) {
    const aulaDiv = document.querySelector(`div.aula [id="${aulaId}"]`)?.parentElement;
    if (!aulaDiv) {
        showAlert('Aula não encontrada no HTML!', 'warning');
        return;
    }

    // Rola até a div.aula
    aulaDiv.scrollIntoView({ behavior: 'smooth' });

    // Remove destaques anteriores em todas as div.aula
    const allMarks = document.querySelectorAll('div.aula mark');
    allMarks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
    });

    if (expressao) {
        // Seleciona elementos de texto (p, span, li) dentro da div.aula
        const textElements = aulaDiv.querySelectorAll('p, span, li');
        textElements.forEach(element => {
            // Preserva a formatação HTML interna
            const walker = document.createTreeWalker(element, Node.TEXT_NODE, null, false);
            let node;
            while (node = walker.nextNode()) {
                const texto = node.textContent;
                const regex = new RegExp(`(${expressao})`, 'gi');
                if (regex.test(texto)) {
                    const span = document.createElement('span');
                    span.innerHTML = texto.replace(regex, '<mark>$1</mark>');
                    node.parentNode.replaceChild(span, node);
                }
            }
        });
    }
}

// Configuração do jQuery
$(document).ready(function () {
    $('#helpMe').click(function () {
        const $divAjuda = $('.iframe');
        const $video = $('#video')[0];

        if ($divAjuda.css('display') === 'block') {
            $divAjuda.css('display', 'none');
            $video.pause();
            $video.currentTime = 0;
        } else {
            $divAjuda.css('display', 'block');
            $divAjuda.css('animation', 'viewHelp 1s');
            $video.play();
        }
    });

    $('#btnCloseVideo').click(function () {
        const $divAjuda = $('.iframe');
        const $video = $('#video')[0];
        $divAjuda.hide();
        $video.pause();
        $video.currentTime = 0;
    });
});

// Função para atualizar a lista de matérias
async function atualizarListaConteudo() {
    try {
        const materias = await dbService.getAllMaterias();
        contentList.innerHTML = '';

        materias.forEach(materia => {
            const materiaElement = criarElementoMateria(materia);
            const aulasList = materiaElement.querySelector('.aula-list');
            aulasList.innerHTML = '';

            if (materia.aulas) {
                materia.aulas.forEach(aulaObj => {
                    const aulaElement = criarElementoAula(aulaObj, materia);
                    aulasList.appendChild(aulaElement);
                });
            }

            contentList.appendChild(materiaElement);
        });

        materiasDatalist.innerHTML = '';
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia.titulo;
            materiasDatalist.appendChild(option);
        });
    } catch (error) {
        showAlert('Erro ao carregar conteúdo: ' + error, 'danger');
    }
}

// Função auxiliar para normalizar texto
function normalizarTexto(texto) {
    return texto.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Função para buscar conteúdo
async function filtrarConteudo(termo) {
    const termoNormalizado = normalizarTexto(termo).trim();
    const termos = termoNormalizado.split(' ');
    const materiaBusca = termos[0] || '';
    const expressaoBusca = termos.slice(1).join(' ') || '';
    const materias = await dbService.getAllMaterias();

    contentList.innerHTML = '';

    materias.forEach(materia => {
        const tituloMateriaNormalizado = normalizarTexto(materia.titulo);
        let materiaVisivel = false;
        const aulasFiltradas = [];

        if (!materiaBusca || tituloMateriaNormalizado.includes(materiaBusca)) {
            if (!expressaoBusca) {
                materiaVisivel = true;
                aulasFiltradas.push(...(materia.aulas || []));
            } else {
                (materia.aulas || []).forEach(aula => {
                    const tituloAulaNormalizado = normalizarTexto(aula.titulo);
                    const conteudoAulaNormalizado = aula.conteudo ? normalizarTexto(aula.conteudo) : '';

                    if (tituloAulaNormalizado.includes(expressaoBusca) ||
                        conteudoAulaNormalizado.includes(expressaoBusca)) {
                        materiaVisivel = true;
                        aulasFiltradas.push(aula);
                    }
                });
            }
        }

        if (materiaVisivel) {
            const materiaElement = criarElementoMateria(materia);
            const aulasList = materiaElement.querySelector('.aula-list');
            aulasList.innerHTML = '';

            aulasFiltradas.forEach(aula => {
                const aulaElement = criarElementoAula(aula, materia);
                aulaElement.querySelector('.aula-link').dataset.expressao = expressaoBusca;
                aulasList.appendChild(aulaElement);
            });

            contentList.appendChild(materiaElement);
            if (termo !== '') {
                aulasList.classList.add('show', 'slide-down');
            }
        }
    });
}

// Event Listeners
lancarBtn.addEventListener('click', async () => {
    const tituloMateria = materiaInput.value.trim();
    const tituloAula = aulaInput.value.trim();
    const conteudoAula = conteudoInput.value.trim();

    if (!tituloMateria || !tituloAula) {
        showAlert('Por favor, preencha a matéria e o título da aula!', 'warning');
        return;
    }

    try {
        toggleLoading(true);
        let materia = await dbService.getMateriaByTitulo(tituloMateria);

        if (materia) {
            if (!materia.aulas.some(aula => aula.titulo === tituloAula)) {
                materia.aulas.push({
                    titulo: tituloAula,
                    id: gerarIdAleatorio(),
                    conteudo: conteudoAula || ''
                });
                await dbService.updateMateria(materia);
            }
        } else {
            materia = {
                titulo: tituloMateria,
                aulas: [{
                    titulo: tituloAula,
                    id: gerarIdAleatorio(),
                    conteudo: conteudoAula || ''
                }]
            };
            await dbService.salvarMateria(materia);
        }

        materiaInput.value = '';
        aulaInput.value = '';
        conteudoInput.value = '';
        await atualizarListaConteudo();
        showAlert('Conteúdo salvo com sucesso!');
    } catch (error) {
        showAlert('Erro ao salvar conteúdo: ' + error, 'danger');
    } finally {
        toggleLoading(false);
    }
});

searchInput.addEventListener('input', (e) => {
    filtrarConteudo(e.target.value.trim());
});

exportarBtn.addEventListener('click', async () => {
    try {
        const materias = await dbService.getAllMaterias();
        const dataStr = JSON.stringify(materias, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sisdico_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert('Dados exportados com sucesso!');
    } catch (error) {
        showAlert('Erro ao exportar dados: ' + error, 'danger');
    }
});

importarBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            toggleLoading(true);
            const text = await file.text();
            const materias = JSON.parse(text);

            for (const materia of materias) {
                await dbService.salvarMateria(materia);
            }

            await atualizarListaConteudo();
            showAlert('Dados importados com sucesso!');
        } catch (error) {
            showAlert('Erro ao importar dados: ' + error, 'danger');
        } finally {
            toggleLoading(false);
            importFile.value = '';
        }
    }
});

// Botão de retorno ao topo
window.onload = function () {
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 100) {
            document.querySelector('.back-to-top').style.display = 'block';
        } else {
            document.querySelector('.back-to-top').style.display = 'none';
        }
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    atualizarListaConteudo();
});

// Estilo para destaque
const style = document.createElement('style');
style.innerHTML = `
    mark {
        background-color: yellow;
        font-weight: bold;
    }
`;
document.head.appendChild(style);