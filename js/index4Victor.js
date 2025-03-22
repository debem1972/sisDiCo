
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
    for (let i = 0; i < 6; i++) {
        id += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return id;
}

function extrairNumeroDaAula(titulo) {
    const numeros = titulo.match(/\d+/g); // Pega todos os números dentro do título
    return numeros ? parseInt(numeros.join(''), 10) : 0; // Converte para número inteiro
}

// Modifica a função criarElementoMateria para manter a funcionalidade de expandir/recolher
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

    // Ordena as aulas numericamente antes de adicioná-las
    if (materia.aulas && materia.aulas.length > 0) {
        materia.aulas.sort((a, b) => extrairNumeroDaAula(a.titulo) - extrairNumeroDaAula(b.titulo));

        // Limpa a lista antes de recriar os elementos para evitar duplicação
        aulasList.innerHTML = "";

        materia.aulas.forEach(aula => {
            aulasList.appendChild(criarElementoAula(aula, materia));
        });
    }

    materiaElement.appendChild(materiaHeader);
    materiaElement.appendChild(aulasList);

    // Eventos da matéria
    materiaHeader.addEventListener('click', (e) => {
        if (!e.target.classList.contains('edit-btn')) {
            // Só permite toggle se não estiver filtrando
            if (searchInput.value.trim() === '') {
                aulasList.classList.toggle('show');
                if (aulasList.classList.contains('show')) {
                    aulasList.classList.add('slide-down');
                }
            }
        }
    });

    // Botão editar
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

    // Botão excluir
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




//----------------------------------------------------------------
function criarElementoAula(aulaObj, materia) {
    const aulaItem = document.createElement('li');
    aulaItem.className = 'aula-item';
    aulaItem.dataset.id = aulaObj.id; // Adiciona ID como dataset para evitar duplicação

    aulaItem.innerHTML = `
        <a href="#${aulaObj.id}" class="aula-link">🔗 ${aulaObj.id}</a>
        <span class="aula-titulo">${aulaObj.titulo}</span>
        <button class="btn btn-sm btn-outline-danger edit-btn">Excluir</button>
        <button class="btn btn-sm btn-outline-primary edit-btn">Editar</button>
    `;



    // Botão editar aula
    const editBtn = aulaItem.querySelector('.btn-outline-primary');
    editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const novoTitulo = prompt('Digite o novo título da aula:', aulaObj.titulo);
        if (novoTitulo && novoTitulo !== aulaObj.titulo) {
            try {
                const index = materia.aulas.findIndex(a => a.id === aulaObj.id);
                materia.aulas[index].titulo = novoTitulo;
                await dbService.updateMateria(materia);
                aulaItem.querySelector('.aula-titulo').textContent = novoTitulo;
                showAlert('Aula atualizada com sucesso!');
            } catch (error) {
                showAlert('Erro ao atualizar aula: ' + error, 'danger');
            }
        }
    });

    // Botão excluir aula
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
//----------------------------------------------------------------

$(document).ready(function () {

    // Chamando o vídeo de ajuda
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


    //Configurando um botão de fechar o vídeo
    $('#btnCloseVideo').click(function () {
        const $divAjuda = $('.iframe');
        const $video = $('#video')[0];
        $divAjuda.hide();
        $video.pause();  // Pausa o vídeo
        $video.currentTime = 0;
        //$('.contentVideo').hide();
    });
});



//-----------------------------------------------------------------
// Função para atualizar a lista de matérias
async function atualizarListaConteudo() {
    try {
        const materias = await dbService.getAllMaterias();
        contentList.innerHTML = '';

        materias.forEach(materia => {
            const materiaElement = criarElementoMateria(materia);
            const aulasList = materiaElement.querySelector('.aula-list');

            // Limpa a lista de aulas antes de adicionar
            aulasList.innerHTML = '';

            if (materia.aulas) {
                materia.aulas.forEach(aulaObj => {
                    const aulaElement = criarElementoAula(aulaObj, materia);
                    aulasList.appendChild(aulaElement);
                });
            }

            contentList.appendChild(materiaElement);
        });

        // Atualizar datalists
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

//---------------------------------------------------------------------------
// Função auxiliar para normalizar texto (remover acentos e converter para minúsculas)
function normalizarTexto(texto) {
    return texto.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}


// Função para buscar conteúdo
// Função modificada para filtrar conteúdo
function filtrarConteudo(termo) {
    const termoNormalizado = normalizarTexto(termo);
    const materias = document.querySelectorAll('.materia-item');

    materias.forEach(materia => {
        const tituloMateria = materia.querySelector('.materia-titulo').textContent;
        const tituloMateriaNormalizado = normalizarTexto(tituloMateria);
        const aulas = materia.querySelectorAll('.aula-item');
        const aulasList = materia.querySelector('.aula-list');
        let materiaVisivel = false;

        // Verifica se o termo corresponde ao título da matéria
        if (tituloMateriaNormalizado.includes(termoNormalizado)) {
            materiaVisivel = true;
            // Mostra todas as aulas quando a matéria corresponde
            aulas.forEach(aula => {
                aula.style.display = 'block';
            });
        } else {
            // Verifica cada aula
            aulas.forEach(aula => {
                const tituloAula = aula.querySelector('.aula-titulo').textContent;
                const tituloAulaNormalizado = normalizarTexto(tituloAula);

                if (tituloAulaNormalizado.includes(termoNormalizado)) {
                    materiaVisivel = true;
                    aula.style.display = 'block';
                } else {
                    aula.style.display = 'none';
                }
            });
        }

        // Atualiza a visibilidade da matéria
        materia.style.display = materiaVisivel ? 'block' : 'none';

        // Mantém a lista de aulas expandida durante a pesquisa se houver resultados
        if (materiaVisivel && termo !== '') {
            aulasList.classList.add('show', 'slide-down');
        } else if (termo === '') {
            // Volta ao estado normal quando não há termo de busca
            aulasList.classList.remove('show', 'slide-down');
        }
    });
}
//-------------------------------------------------------------------------------
//Novo sistema de busca
// Função para buscar conteúdo considerando elementos ocultos com d-none
// Função para buscar conteúdo considerando palavras-chave individuais
/*function filtrarConteudo(termo) {
    // Se não houver termo, mostrar tudo
    if (!termo.trim()) {
        mostrarTudo();
        return;
    }

    // Normaliza o termo e separa em palavras-chave
    const termoNormalizado = normalizarTexto(termo);
    const palavrasChave = termoNormalizado.split(/\s+/).filter(palavra => palavra.length > 2);

    // Se não houver palavras-chave válidas após filtrar, mostrar tudo
    if (palavrasChave.length === 0) {
        mostrarTudo();
        return;
    }

    const materias = document.querySelectorAll('.materia-item');

    materias.forEach(materia => {
        const tituloMateria = materia.querySelector('.materia-titulo').textContent;
        const tituloMateriaNormalizado = normalizarTexto(tituloMateria);
        const aulas = materia.querySelectorAll('.aula-item');
        const aulasList = materia.querySelector('.aula-list');
        let materiaVisivel = false;

        // Verifica se alguma palavra-chave corresponde ao título da matéria
        if (contemPalavrasChave(tituloMateriaNormalizado, palavrasChave)) {
            materiaVisivel = true;
            // Mostra todas as aulas quando a matéria corresponde
            aulas.forEach(aula => {
                aula.style.display = 'block';
            });
        } else {
            // Busca na descrição/assunto da matéria
            const assuntosMateria = materia.querySelectorAll('.assunto');
            let assuntoEncontrado = false;

            // Verifica cada elemento .assunto na matéria
            assuntosMateria.forEach(assunto => {
                const textoAssunto = normalizarTexto(assunto.textContent);
                if (contemPalavrasChave(textoAssunto, palavrasChave)) {
                    assuntoEncontrado = true;
                }
            });

            if (assuntoEncontrado) {
                materiaVisivel = true;
                // Mostra todas as aulas quando a descrição da matéria corresponde
                aulas.forEach(aula => {
                    aula.style.display = 'block';
                });
            } else {
                // Verifica cada aula
                aulas.forEach(aula => {
                    const tituloAula = aula.querySelector('.aula-titulo').textContent;
                    const tituloAulaNormalizado = normalizarTexto(tituloAula);
                    let aulaVisivel = false;

                    // Verifica no título da aula
                    if (contemPalavrasChave(tituloAulaNormalizado, palavrasChave)) {
                        aulaVisivel = true;
                    } else {
                        // Busca na descrição/assunto da aula
                        const assuntosAula = aula.querySelectorAll('.assunto');
                        assuntosAula.forEach(assunto => {
                            const textoAssunto = normalizarTexto(assunto.textContent);
                            if (contemPalavrasChave(textoAssunto, palavrasChave)) {
                                aulaVisivel = true;
                            }
                        });
                    }

                    // Atualiza a visibilidade da aula
                    aula.style.display = aulaVisivel ? 'block' : 'none';

                    // Atualiza o estado da matéria se alguma aula for visível
                    if (aulaVisivel) {
                        materiaVisivel = true;
                    }
                });
            }
        }

        // Atualiza a visibilidade da matéria
        materia.style.display = materiaVisivel ? 'block' : 'none';

        // Mantém a lista de aulas expandida durante a pesquisa se houver resultados
        if (materiaVisivel && termo !== '') {
            aulasList.classList.add('show', 'slide-down');
        } else if (termo === '') {
            // Volta ao estado normal quando não há termo de busca
            aulasList.classList.remove('show', 'slide-down');
        }
    });
}

// Função para verificar se um texto contém palavras-chave
// Retorna true se todas as palavras-chave estiverem presentes
function contemPalavrasChave(texto, palavrasChave) {
    // Exige que todas as palavras-chave estejam presentes
    return palavrasChave.every(palavra => texto.includes(palavra));
}

// Função auxiliar para normalizar texto
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

// Função para mostrar todos os elementos
function mostrarTudo() {
    const materias = document.querySelectorAll('.materia-item');
    materias.forEach(materia => {
        materia.style.display = 'block';
        const aulas = materia.querySelectorAll('.aula-item');
        aulas.forEach(aula => {
            aula.style.display = 'block';
        });
        const aulasList = materia.querySelector('.aula-list');
        if (aulasList) {
            aulasList.classList.remove('show', 'slide-down');
        }
    });
}*/

//-----------------------------------------------------------------------------

// Event Listeners
lancarBtn.addEventListener('click', async () => {
    const tituloMateria = materiaInput.value.trim();
    const tituloAula = aulaInput.value.trim();

    if (!tituloMateria || !tituloAula) {
        showAlert('Por favor, preencha todos os campos!', 'warning');
        return;
    }

    try {
        toggleLoading(true);
        let materia = await dbService.getMateriaByTitulo(tituloMateria);

        if (materia) {
            if (!materia.aulas.some(aula => aula.titulo === tituloAula)) {
                // Agora salvamos um objeto com título e ID para cada aula
                materia.aulas.push({
                    titulo: tituloAula,
                    id: gerarIdAleatorio()
                });
                await dbService.updateMateria(materia);
            }
        } else {
            materia = {
                titulo: tituloMateria,
                aulas: [{
                    titulo: tituloAula,
                    id: gerarIdAleatorio()
                }]
            };
            await dbService.salvarMateria(materia);
        }

        materiaInput.value = '';
        aulaInput.value = '';
        await atualizarListaConteudo();
        showAlert('Conteúdo salvo com sucesso!');
    } catch (error) {
        showAlert('Erro ao salvar conteúdo: ' + error, 'danger');
    } finally {
        toggleLoading(false);
    }
});

// Event Listener modificado para o campo de busca
searchInput.addEventListener('input', (e) => {
    filtrarConteudo(e.target.value.trim());
});

// Exportar dados
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

// Importar dados
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

//-------------------------------------------------------------------------------------------
//Função para o botão de ir ao topo aparecer somente após a rolagem do scroll
//Botão de retorno ao tôpo
window.onload = function () {
    // Exibe o botão quando a página é rolada para baixo
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 100) {
            document.querySelector('.back-to-top').style.display = 'block';
        } else {
            document.querySelector('.back-to-top').style.display = 'none';
        }
    });
}

function scrollToTop() {
    // Rola a página até o topo
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
//----------------------------------------------------------------------------




// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    atualizarListaConteudo();
});


