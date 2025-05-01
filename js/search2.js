function normalizarTexto(texto) {
    return texto.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s_]/g, ''); // Preserva o underline (_)
}

async function filtrarConteudo(termo, dbService, contentList, criarElementoMateria, criarElementoAula) {
    // Remove espaços extras e normaliza o termo
    const termoLimpo = termo.replace(/\s+/g, ' ').trim();
    const termoNormalizado = normalizarTexto(termoLimpo);
    const termos = termoNormalizado.split(' ').filter(t => t); // Remove strings vazias
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

function destacarExpressaoNaAula(aulaId, expressao, showAlert) {
    const anchorElement = document.querySelector(`[id="${aulaId}"]`);
    const aulaDiv = anchorElement?.closest('div.aula');
    if (!aulaDiv) {
        showAlert('Aula não encontrada no HTML!', 'warning');
        return;
    }

    aulaDiv.scrollIntoView({ behavior: 'smooth' });

    const allMarks = document.querySelectorAll('div.aula mark');
    allMarks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
    });

    if (expressao) {
        const escapedExpressao = expressao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        const regex = new RegExp(`\\b${escapedExpressao}\\b\\(\\)??`, 'gi');
        let encontrou = false;

        const walker = document.createTreeWalker(aulaDiv, Node.TEXT_NODE, null, false);
        let node;
        while (node = walker.nextNode()) {
            const texto = node.textContent;
            console.log('Texto encontrado no DOM:', texto); // Log de depuração
            console.log('Expressão buscada:', expressao, 'Regex:', regex); // Log de depuração
            if (regex.test(texto)) {
                encontrou = true;
                const span = document.createElement('span');
                span.innerHTML = texto.replace(regex, '<mark>$&</mark>');
                node.parentNode.replaceChild(span, node);
            }
        }

        if (!encontrou) {
            showAlert(`Expressão "${expressao}" não encontrada no conteúdo da aula!`, 'warning');
        }
    }
}